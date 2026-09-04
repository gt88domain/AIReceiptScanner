---
name: easystarter-web-dev-start
description: "Start EasyStarter Web + Server local development. Use when the user says 'start dev', 'run locally', 'pnpm dev', 'start the app', or asks about local env setup, ports, or server connection issues."
---

# EasyStarter Web Dev Start

Bring up local Web (port 3000) and Server (port 3001) with matching env, D1 state, and API connectivity.

## Decision Tree

```
User wants to run locally ->
  First time ever              -> Section: First-Time Setup
  "it was working, now broken" -> Section: Common Mistakes (diagnose)
  "just start it"              -> Run: pnpm dev:web+server
  "server only" / "web only"   -> pnpm dev:server / pnpm dev:web
  "database error"             -> Section: Local D1 Initialization
  "auth not working locally"   -> Section: Cookie/Auth Troubleshooting
```

## First-Time Setup

### 1. Create env files from examples

```bash
cp apps/web/.env.development.example apps/web/.env.development
cp apps/server/.dev.vars.example apps/server/.dev.vars
```

### 2. Verify local URLs match

`apps/web/.env.development`:

```
VITE_SERVER_URL=http://localhost:3001
VITE_APP_URL=http://localhost:3000
```

`apps/server/.dev.vars`:

```
NODE_ENV=development
WEBSITE_URL=http://localhost:3000
SERVER_URL=http://localhost:3001
```

These MUST agree. The web client calls `VITE_SERVER_URL` for API requests. The server uses `WEBSITE_URL` for CORS and `SERVER_URL` for auth callback URLs.

### 3. Set BETTER_AUTH_SECRET

```bash
# Generate a secret
openssl rand -base64 32
```

Paste the output into `apps/server/.dev.vars`:

```
BETTER_AUTH_SECRET=your_generated_secret
```

### 4. Initialize local D1

```bash
pnpm db:migrate:local
```

This runs two things under the hood:
1. `wrangler d1 execute DB --local` -- creates the SQLite file at `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`
2. `drizzle-kit migrate --config drizzle.local.config.ts` -- applies all migrations

The local Drizzle config auto-discovers the SQLite file:

```typescript
// apps/server/drizzle.local.config.ts
function findLocalD1DatabaseFile() {
  const baseDir = resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  const entries = readdirSync(baseDir).filter((entry) => entry.endsWith(".sqlite"));
  const preferred = entries.find((entry) => entry !== "local.sqlite");
  return preferred ? join(baseDir, preferred) : entries[0] ? join(baseDir, entries[0]) : null;
}
```

### 5. Start

```bash
pnpm dev:web+server
```

This runs `turbo -F web -F server dev` which starts:
- **Web**: Vite dev server on port 3000
- **Server**: Wrangler dev on port 3001

## How the API Client Connects

The web app creates a typed oRPC client in `apps/web/src/utils/orpc.ts`:

```typescript
export const client = createApiClient<AppRouterClient>({
  baseUrl: import.meta.env.VITE_SERVER_URL,   // http://localhost:3001
  credentials: "include",                      // send cookies for auth
  serviceBinding: getServiceBinding(),         // undefined in browser, API_SERVICE on CF
});
```

In production on Cloudflare, `getServiceBinding()` returns the `API_SERVICE` service binding for zero-latency server-side calls. In the browser and during local dev, it falls back to HTTP via `VITE_SERVER_URL`.

## Environment Variables

| File | Variable | Local Value | Purpose |
|------|----------|-------------|---------|
| `apps/web/.env.development` | `VITE_SERVER_URL` | `http://localhost:3001` | API base URL for web client |
| `apps/web/.env.development` | `VITE_APP_URL` | `http://localhost:3000` | Web origin for OAuth callbacks |
| `apps/web/.env.development` | `VITE_GA_MEASUREMENT_ID` | (empty) | Optional: Google Analytics |
| `apps/web/.env.development` | `VITE_OPENPANEL_CLIENT_ID` | (empty) | Optional: OpenPanel analytics |
| `apps/server/.dev.vars` | `SERVER_URL` | `http://localhost:3001` | Auth callback base URL |
| `apps/server/.dev.vars` | `WEBSITE_URL` | `http://localhost:3000` | CORS origin + cookie domain |
| `apps/server/.dev.vars` | `BETTER_AUTH_SECRET` | (generate) | Session token signing |
| `apps/server/.dev.vars` | `NODE_ENV` | `development` | Enables dev-only trusted origins |

## Cookie/Auth Troubleshooting

Auth cookies are configured dynamically in `apps/server/src/lib/auth.ts`:

```typescript
const { cookieDomain, sameSite, secure } = resolveCookiePolicy(env.SERVER_URL, env.WEBSITE_URL);
// ...
advanced: {
  defaultCookieAttributes: {
    sameSite,        // "Lax" for localhost, "None" for cross-site HTTPS
    secure,          // false for http://, true for https://
    httpOnly: !env.SERVER_URL?.includes("localhost"),
    domain: cookieDomain,
    path: "/",
  },
},
```

In local dev with `http://localhost:*`, cookies are `SameSite=Lax`, `Secure=false`, `httpOnly=false`. This works because both ports share `localhost`.

**If auth fails locally, check:**
1. `SERVER_URL` and `WEBSITE_URL` both use `localhost` (not `127.0.0.1` vs `localhost`)
2. `BETTER_AUTH_SECRET` is set (empty = no session signing)
3. D1 is initialized (`pnpm db:migrate:local`)

## Dev-Mode Trusted Origins

The server automatically trusts Expo development origins when `NODE_ENV=development`:

```typescript
trustedOrigins: [
  env.WEBSITE_URL || "",
  nativeConfig.app.name + "://",
  ...(process.env.NODE_ENV === "development"
    ? ["exp://", "exp://**", "exp://192.168.*.*:*/**"]
    : []),
],
```

## Common Mistakes

| Mistake | Why It Happens | Fix |
|---------|---------------|-----|
| "CORS error" on API calls | `WEBSITE_URL` in `.dev.vars` doesn't match where the browser is running | Set `WEBSITE_URL=http://localhost:3000` (exact match) |
| "Local D1 database not found" | Never ran init or `.wrangler/` was cleaned | `pnpm db:migrate:local` |
| Port 3001 already in use | Previous wrangler process didn't stop | Kill the process: `lsof -ti:3001 \| xargs kill` |
| Auth redirects to production URL | `SERVER_URL` in `.dev.vars` points to production domain | Set `SERVER_URL=http://localhost:3001` |
| "Missing BETTER_AUTH_SECRET" | `.dev.vars` was copied but secret left empty | Generate with `openssl rand -base64 32` |
| Changes to `.dev.vars` not picked up | Wrangler doesn't hot-reload env changes | Restart `pnpm dev:server` |

## Verification Checklist

- [ ] `pnpm dev:web+server` starts both processes
- [ ] http://localhost:3000 loads the landing page
- [ ] http://localhost:3001/ returns `{"status":"ok"}`
- [ ] Sign-in page renders at http://localhost:3000/auth/sign-in
- [ ] `pnpm db:studio:local` opens Drizzle Studio against local D1
