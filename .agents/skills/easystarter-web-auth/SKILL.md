---
name: easystarter-web-auth
description: Configure EasyStarter Web authentication end-to-end. Use whenever the user mentions login, sign-in, sign-up, OAuth, Google login, GitHub login, Apple sign-in, email OTP, email password, phone SMS login, auth callbacks, Better Auth, trusted origins, CORS auth issues, session cookies, or wants to enable/disable any Web login method. Also use when the user says "configure auth", "set up login", "add Google sign-in", "disable GitHub", or asks why login redirects fail.
---

# EasyStarter Web Auth

Web authentication touches four layers that must stay in sync: the **config switches** that control which methods are available, the **server providers** that implement each method, the **environment variables** that hold credentials, and the **UI components** that render the login form. A mismatch between any two layers — e.g. enabling Google in config but missing `GOOGLE_CLIENT_SECRET` in `.dev.vars` — produces a silent failure or a broken redirect.

This skill walks through each layer and the connections between them.

## Decision Tree

Before editing files, figure out what the user actually needs:

- **Enable/disable a login method** → Section 1 (config switches) + Section 2 (server provider) + Section 3 (env vars)
- **Fix broken OAuth redirect** → Section 4 (callback URLs and trusted origins)
- **Set up auth from scratch** → Read `references/full-setup-guide.md`
- **Cookie / session issues across subdomains** → Section 5 (cookie policy)
- **Phone SMS OTP (China)** → Read `references/aliyun-phone-setup.md`

## Section 1: Auth Config Switches

All auth UI visibility is controlled by a single object in `packages/app-config/src/app-config.ts`:

```typescript
// packages/app-config/src/app-config.ts — lines ~147-186
auth: {
  methods: {
    emailPasswordEnabled: true,   // email + password form
    emailOtpEnabled: true,        // email one-time code
    smsEnabled: true,             // phone SMS OTP (Aliyun)
    githubEnabled: true,          // GitHub OAuth button
    googleEnabled: true,          // Google OAuth button
    appleEnabled: true,           // Apple Sign-In button
  },
  otp: {
    email: {
      otpLength: 6,
      expiresInSeconds: 300,
      allowedAttempts: 3,
      resendCooldownSeconds: 60,
    },
    sms: {
      otpLength: 6,
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
    },
  },
},
```

These switches flow to the Web UI via `apps/web/src/configs/web-config.ts`:

```typescript
// apps/web/src/configs/web-config.ts — webConfig.auth.methods
auth: {
  methods: {
    emailPasswordEnabled: commonConfig.auth.methods.emailPasswordEnabled ?? false,
    emailOtpEnabled: commonConfig.auth.methods.emailOtpEnabled ?? false,
    smsEnabled: commonConfig.auth.methods.smsEnabled ?? false,
    githubEnabled: commonConfig.auth.methods.githubEnabled ?? false,
    googleEnabled: commonConfig.auth.methods.googleEnabled ?? false,
    appleEnabled: commonConfig.auth.methods.appleEnabled ?? false,
  },
},
```

The sign-in form (`apps/web/src/components/auth/sign-in-form.tsx`) reads these switches to decide which tabs and buttons to render:

```typescript
// apps/web/src/components/auth/sign-in-form.tsx — lines 24-31
const enabledSignInMethods = [
  webConfig.auth.methods.emailPasswordEnabled ? "email" : null,
  webConfig.auth.methods.smsEnabled ? "phone" : null,
  webConfig.auth.methods.emailOtpEnabled ? "otp" : null,
].filter((method): method is SignInMethod => method !== null);

const hasSocialSignInMethods =
  webConfig.auth.methods.githubEnabled || webConfig.auth.methods.googleEnabled;
```

**To disable a method**: set its flag to `false` in `app-config.ts`. The UI tabs and OAuth buttons disappear automatically. Do not delete the server-side provider code — keep it for future re-enablement.

**Example — Google only, everything else off:**
```typescript
methods: {
  emailPasswordEnabled: false,
  emailOtpEnabled: false,
  smsEnabled: false,
  githubEnabled: false,
  googleEnabled: true,
  appleEnabled: false,
},
```

## Section 2: Server Auth Providers

The server creates a Better Auth instance in `apps/server/src/lib/auth.ts`. Each social provider reads its `enabled` flag from the same config object:

```typescript
// apps/server/src/lib/auth.ts — lines 189-207
socialProviders: {
  github: {
    enabled: commonConfig.auth.methods.githubEnabled ?? false,
    clientId: env.GITHUB_CLIENT_ID || "",
    clientSecret: env.GITHUB_CLIENT_SECRET || "",
    redirectURI: joinUrl(env.SERVER_URL, "/api/auth/callback/github"),
  },
  google: {
    prompt: "select_account",
    enabled: commonConfig.auth.methods.googleEnabled ?? false,
    clientId: env.GOOGLE_CLIENT_ID || "",
    clientSecret: env.GOOGLE_CLIENT_SECRET || "",
    redirectURI: joinUrl(env.SERVER_URL, "/api/auth/callback/google"),
  },
  apple: {
    ...getAppleProviderConfig(),
    enabled: commonConfig.auth.methods.appleEnabled ?? false,
  },
},
```

Email/password is configured at lines 152-172. Email OTP is a plugin at lines 246-262. Phone SMS is a plugin at lines 263-284.

The provider code stays in place even when `enabled: false` — the config switch gates it safely.

## Section 3: Environment Variables

| Variable | Where | Scope |
|----------|-------|-------|
| `BETTER_AUTH_SECRET` | `apps/server/.dev.vars` + `.env.production` | Secret — generate with `openssl rand -base64 32` |
| `GITHUB_CLIENT_ID` | `apps/server/wrangler.jsonc` → `vars` | Public |
| `GITHUB_CLIENT_SECRET` | `apps/server/.dev.vars` + `.env.production` | Secret |
| `GOOGLE_CLIENT_ID` | `apps/server/wrangler.jsonc` → `vars` | Public |
| `GOOGLE_CLIENT_SECRET` | `apps/server/.dev.vars` + `.env.production` | Secret |
| `APPLE_APP_BUNDLE_IDENTIFIER` | `apps/server/wrangler.jsonc` → `vars` | Public — must match `app.json` `ios.bundleIdentifier` |
| `RESEND_API_KEY` | `apps/server/.dev.vars` + `.env.production` | Secret — needed if email-based auth is enabled |
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | `apps/server/.dev.vars` + `.env.production` | Secret — needed if SMS auth is enabled |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | `apps/server/.dev.vars` + `.env.production` | Secret — needed if SMS auth is enabled |

**Public IDs go in `wrangler.jsonc` `vars`; secrets go in `.dev.vars` / `.env.production` only.** Never put secrets in `wrangler.jsonc` or Web env files.

## Section 4: Callback URLs and Trusted Origins

OAuth redirects fail if the callback URL registered in the provider dashboard doesn't match what the server sends.

**Google OAuth:**
- Authorized JavaScript origins: `http://localhost:3000` (dev), production Web URL
- Authorized redirect URI: `{SERVER_URL}/api/auth/callback/google`
- Local: `http://localhost:3001/api/auth/callback/google`
- Production: `https://api.yourdomain.com/api/auth/callback/google`

**GitHub OAuth:**
- Homepage URL: production Web URL
- Authorization callback URL: `{SERVER_URL}/api/auth/callback/github`

**Trusted origins** in `apps/server/src/lib/auth.ts` lines 139-151 control which origins can make auth requests:

```typescript
trustedOrigins: [
  env.WEBSITE_URL || "",            // Web app origin
  nativeConfig.app.name + "://",    // Native app scheme
  // Dev-mode Expo origins added automatically
],
```

If Web and Server are on different subdomains (e.g. `app.example.com` and `api.example.com`), the cookie policy auto-resolves a shared `.example.com` domain. But if they're on completely different domains, `SameSite` switches to `None` and `Secure` must be `true` — which means HTTPS is mandatory.

## Section 5: Cookie Policy (Cross-Subdomain)

The `resolveCookiePolicy` function (lines 62-85 in `auth.ts`) automatically detects whether Web and Server share a root domain:

- **Same subdomain** (e.g. both on `localhost:300x`): `SameSite=Lax`, no domain attribute
- **Shared root domain** (e.g. `app.example.com` / `api.example.com`): `SameSite=Lax`, `domain=.example.com`
- **Different domains**: `SameSite=None`, `Secure=true` — requires HTTPS

If sessions work locally but break in production, check that `SERVER_URL` and `WEBSITE_URL` in `wrangler.jsonc` are correctly set to production URLs.

## Verification

After any auth change:
1. `pnpm dev:web+server` — start both locally
2. Test each enabled login method — the sign-in form should show only the enabled tabs/buttons
3. For OAuth: complete the full redirect flow and confirm you land back on the app signed in
4. `pnpm check-types` — catch any type mismatches from config changes

## Common Mistakes

- **Enabling Google in config but forgetting `GOOGLE_CLIENT_SECRET` in `.dev.vars`** — the Google button appears but clicking it produces a server error. Always check both config switch AND env vars.
- **Mismatched callback URLs** — Google and GitHub dashboards must have the exact callback URL including the `/api/auth/callback/{provider}` path on the SERVER_URL, not the Web URL.
- **Using `WEBSITE_URL` for callback URIs** — callbacks hit the Server, not the Web app. The redirect URI must use `SERVER_URL`.
- **Forgetting `BETTER_AUTH_SECRET`** — sessions fail silently. Generate a separate value for dev and production.
- **Deleting provider code instead of disabling** — set config to `false` instead. The code stays intact for re-enablement.
