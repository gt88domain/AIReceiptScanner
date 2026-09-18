---
name: easystarter-web-deploy-web
description: "Deploy EasyStarter Web to Cloudflare Workers. Use when the user says 'deploy web', 'deploy frontend', or asks about service binding, Web Worker, VITE_SERVER_URL, or production Web URL."
---

# EasyStarter Web Deploy Web

Deploy the Web Worker to Cloudflare. Must deploy AFTER the server -- the web worker's service binding references the server worker by name.

## Decision Tree

```
User wants to deploy web ->
  Server not deployed yet     -> Deploy server first (easystarter-web-deploy-server skill)
  First deploy                -> Section: Full Deploy Steps
  "service binding error"     -> Section: Service Binding
  "wrong URLs in production"  -> Section: Production URL Config
  "just redeploy"             -> pnpm deploy:web
  "both server and web"       -> pnpm deploy (deploys server then web)
```

## Full Deploy Steps

### 1. Confirm server is deployed

The web worker calls the server worker via service binding. If the server worker does not exist, the web deploy will succeed but all server-side API calls will fail with 523 errors.

```bash
# Verify server worker exists
pnpm wrangler deployments list --name easystarter-server
```

### 2. Verify wrangler.jsonc

`apps/web/wrangler.jsonc`:

```jsonc
{
  "name": "easystarter-web",
  "main": "@tanstack/react-start/server-entry",
  "assets": {
    "not_found_handling": "single-page-application"
  },
  "services": [{
    "binding": "API_SERVICE",
    "service": "easystarter-server"    // MUST match server wrangler "name"
  }],
  "vars": {
    "VITE_SERVER_URL": "https://your-server-domain.com",
    "VITE_APP_URL": "https://your-web-domain.com",
    "VITE_GA_MEASUREMENT_ID": "G-...",
    "VITE_OPENPANEL_CLIENT_ID": "..."
  }
}
```

### 3. Deploy

```bash
pnpm deploy:web
```

This runs `turbo -F web deploy` which executes `wrangler deploy`.

Or deploy both together (server first, then web):

```bash
pnpm deploy
# Equivalent to: pnpm deploy:server && pnpm deploy:web
```

## Service Binding

The service binding is how the web worker calls the server worker without going through the public internet. This is critical for performance -- SSR API calls happen via direct worker-to-worker communication.

```jsonc
// apps/web/wrangler.jsonc
"services": [{
  "binding": "API_SERVICE",              // referenced in code as API_SERVICE
  "service": "easystarter-server"        // must match server worker name exactly
}]
```

The web client switches between service binding (server-side) and HTTP (browser):

```typescript
// apps/web/src/utils/orpc.ts
function getServiceBinding() {
  if (typeof window !== "undefined") return undefined;     // browser: no binding
  return typeof API_SERVICE === "undefined" ? undefined : API_SERVICE;
}

export const client = createApiClient<AppRouterClient>({
  baseUrl: import.meta.env.VITE_SERVER_URL,    // fallback for browser requests
  credentials: "include",
  serviceBinding: getServiceBinding(),          // direct binding for SSR
});
```

**If the service name doesn't match**, the web worker still deploys but:
- Server-side rendering (SSR) API calls fail
- Browser-side calls work (they use `VITE_SERVER_URL` via HTTP)
- You see 523 "Origin is unreachable" errors in SSR contexts

## Production URL Config

### Environment variables

| Variable | In | Value | Purpose |
|----------|-----|-------|---------|
| `VITE_SERVER_URL` | `wrangler.jsonc` vars | `https://your-server-domain.com` | API base URL for browser requests |
| `VITE_APP_URL` | `wrangler.jsonc` vars | `https://your-web-domain.com` | OAuth callback origin, SEO canonical |
| `VITE_GA_MEASUREMENT_ID` | `wrangler.jsonc` vars | `G-XXXXXXX` | Google Analytics (optional) |
| `VITE_OPENPANEL_CLIENT_ID` | `wrangler.jsonc` vars | UUID | OpenPanel analytics (optional) |

All `VITE_*` variables are exposed to the client bundle. Never put secrets in `VITE_*` vars.

### URL consistency check

These URLs must align across files:

```
apps/server/wrangler.jsonc  "WEBSITE_URL" == apps/web/wrangler.jsonc "VITE_APP_URL"
apps/server/wrangler.jsonc  "SERVER_URL"  == apps/web/wrangler.jsonc "VITE_SERVER_URL"
```

The server uses `WEBSITE_URL` for CORS and cookie domain. The web client uses `VITE_APP_URL` for auth callback URLs. If they don't match, cookies and OAuth redirects break.

### How URLs flow through the web app

`apps/web/src/configs/web-config.ts` resolves the app URL:

```typescript
function resolveAppUrl(): string {
  const configuredAppUrl = import.meta.env.VITE_APP_URL;
  if (configuredAppUrl) return configuredAppUrl;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
```

Auth callback URLs are built from this:

```typescript
export function getAuthUrls(): AuthUrls {
  const localizedBaseUrl = getLocalizedBaseUrl();
  return {
    callbackURL: `${localizedBaseUrl}${webRoutes.authSignIn}`,
    errorCallbackURL: `${localizedBaseUrl}${webRoutes.authSignIn}`,
    resetPasswordCallbackURL: `${localizedBaseUrl}${webRoutes.authResetPassword}`,
  };
}
```

### SEO: noindex for protected routes

The web server entry automatically adds `X-Robots-Tag: noindex, nofollow` for protected routes:

```typescript
// apps/web/src/server.ts
const noIndexPathRegex = /^\/(?:auth|billing|credits|dashboard|settings|users)(?:\/|$)/;
```

## Common Mistakes

| Mistake | Why It Happens | Fix |
|---------|---------------|-----|
| 523 errors on SSR pages | Service binding name mismatch or server not deployed | Check `"service"` in web wrangler matches `"name"` in server wrangler |
| Auth redirects to wrong domain | `VITE_APP_URL` in web wrangler doesn't match `WEBSITE_URL` in server wrangler | Make them identical |
| API calls fail from browser but SSR works | `VITE_SERVER_URL` points to wrong URL or CORS blocks it | Ensure `VITE_SERVER_URL` matches `SERVER_URL` in server wrangler |
| Stale content after deploy | Cloudflare caches assets | Clear Workers cache or wait for propagation |
| Analytics not tracking | `VITE_GA_MEASUREMENT_ID` or `VITE_OPENPANEL_CLIENT_ID` empty in wrangler vars | Set the values (they're public, safe to commit) |
| "Cannot find module @tanstack/react-start/server-entry" | Build failed before deploy | Run `pnpm build` first or check build logs |

## Verification Checklist

- [ ] Server worker is deployed and `curl https://SERVER_URL/` returns `{"status":"ok"}`
- [ ] `apps/web/wrangler.jsonc` `"service"` matches server worker name
- [ ] `VITE_SERVER_URL` and `VITE_APP_URL` use correct production domains
- [ ] `pnpm deploy:web` succeeds
- [ ] `https://YOUR_WEB_DOMAIN/` loads the landing page
- [ ] Sign-in flow completes (OAuth redirects work)
- [ ] Dashboard loads after authentication
- [ ] Protected routes have `X-Robots-Tag: noindex` header
