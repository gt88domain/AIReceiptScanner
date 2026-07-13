---
name: easystarter-mobile-deploy-server
description: "Deploy EasyStarter Server for Mobile clients. Use whenever the user wants to deploy the API server for mobile, push production secrets, configure RevenueCat webhooks, set up Apple Sign-In for production, update EAS env with production URLs, or says 'deploy server', 'go to production', 'push secrets', 'server deploy for mobile', 'RevenueCat webhook URL'."
---

# EasyStarter Mobile Deploy Server

Deploying the server for mobile requires extra steps beyond web: the `APPLE_APP_BUNDLE_IDENTIFIER` must be in wrangler vars, `REVENUECAT_WEBHOOK_SECRET` must be in secrets, and after deploy you need to register the webhook URL in RevenueCat and update EAS env to point native builds at the production server.

## Decision Tree

- **First production deploy** --> All sections in order
- **Server already deployed, adding mobile support** --> Sections 2-5
- **Updating secrets after credential rotation** --> Section 3
- **RevenueCat webhook not firing** --> Section 5 (webhook URL)
- **Native app can't reach production server** --> Section 4 (EAS env)

## Section 1: Wrangler Vars for Mobile

Before deploying, ensure `apps/server/wrangler.jsonc` has these mobile-relevant vars:

```jsonc
// apps/server/wrangler.jsonc — vars section
"vars": {
  "NODE_ENV": "production",
  "SERVER_URL": "https://server.yourdomain.com",   // Your production server URL
  "WEBSITE_URL": "https://app.yourdomain.com",     // Your production web URL
  "GITHUB_CLIENT_ID": "your-github-client-id",     // If GitHub OAuth enabled
  "GOOGLE_CLIENT_ID": "your-google-client-id"      // If Google OAuth enabled
}
```

`APPLE_APP_BUNDLE_IDENTIFIER` is needed for Apple Sign-In but is a secret (it validates idToken audience). Add it to `.dev.vars` for local and `.env.production` for production:

```
APPLE_APP_BUNDLE_IDENTIFIER=native.easystarter.dev
```

This value must match `app.json` `ios.bundleIdentifier` exactly:
```typescript
// apps/server/src/lib/apple-auth.ts — verifyAppleIdentityToken
const verificationOptions = {
  audience: env.APPLE_APP_BUNDLE_IDENTIFIER,
  issuer: "https://appleid.apple.com",
};
```

## Section 2: Production Secrets

Create `apps/server/.env.production` with all secrets:

```bash
# Core
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
SERVER_URL=https://server.yourdomain.com
WEBSITE_URL=https://app.yourdomain.com

# Cloudflare (for Drizzle migrations — not needed at runtime)
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_D1_DATABASE_ID=your-database-id

# OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple Sign-In (native idToken flow)
APPLE_APP_BUNDLE_IDENTIFIER=your-ios-bundle-identifier

# Email
RESEND_API_KEY=re_xxxx

# Storage
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# SMS (if enabled)
ALIBABA_CLOUD_ACCESS_KEY_ID=your-key-id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your-key-secret

# RevenueCat
REVENUECAT_WEBHOOK_SECRET=your-webhook-secret
```

Push all secrets at once:
```bash
pnpm -F server secrets:bulk:production
# Runs: wrangler secret bulk .env.production
```

Or individually:
```bash
cd apps/server
pnpm wrangler secret put BETTER_AUTH_SECRET
pnpm wrangler secret put REVENUECAT_WEBHOOK_SECRET
# ... etc
```

## Section 3: Pre-Deploy Checklist

Before running deploy:

1. **Database migrated** -- `pnpm db:migrate` (production D1)
2. **Secrets pushed** -- `pnpm -F server secrets:bulk:production`
3. **Wrangler vars correct** -- `SERVER_URL`, `WEBSITE_URL`, OAuth client IDs
4. **D1 binding** -- `database_id` matches your production D1
5. **R2 binding** -- `bucket_name` matches your production R2 bucket

## Section 4: Deploy

```bash
pnpm deploy:server
# Runs: turbo -F server deploy
# Which runs: wrangler deploy
```

After deploy, verify the server is live:
```bash
curl https://server.yourdomain.com/api/health
# or just open in browser — should not return a Cloudflare error page
```

## Section 5: Post-Deploy -- Update EAS Env

Update `apps/native/eas.json` to point all profiles at the production server:

```jsonc
// apps/native/eas.json — production profile env
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SERVER_API_URL": "https://server.yourdomain.com",
        "EXPO_PUBLIC_WEB_APP_URL": "https://app.yourdomain.com",
        "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY": "appl_your_key",
        "EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID": "pro",
        "EXPO_PUBLIC_OPENPANEL_CLIENT_ID": "your-client-id",
        "EXPO_PUBLIC_OPENPANEL_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

The development and preview profiles can keep pointing at the production server or use separate staging URLs -- depends on your setup.

## Section 6: Post-Deploy -- RevenueCat Webhook

Register the webhook URL in RevenueCat dashboard:

**URL:** `https://server.yourdomain.com/api/payments/webhook/revenuecat`

**Authorization:** Set the webhook secret in RevenueCat to match `REVENUECAT_WEBHOOK_SECRET`.

The server validates the webhook:
```typescript
// apps/server/src/payments/providers/revenuecat/provider.ts
function requireWebhookAuthorization() {
  if (!env.REVENUECAT_WEBHOOK_SECRET) {
    throw new Error("Missing REVENUECAT_WEBHOOK_SECRET");
  }
  return env.REVENUECAT_WEBHOOK_SECRET.trim();
}
```

RevenueCat sends the secret in the `Authorization` header. The server accepts both raw and `Bearer`-prefixed formats.

## Section 7: Post-Deploy -- OAuth Callback URLs

Update OAuth provider dashboards with production callback URLs:

| Provider | Callback URL |
|----------|-------------|
| Google | `https://server.yourdomain.com/api/auth/callback/google` |
| GitHub | `https://server.yourdomain.com/api/auth/callback/github` |

These are constructed by the server from `SERVER_URL`:
```typescript
// apps/server/src/lib/auth.ts
github: {
  redirectURI: joinUrl(env.SERVER_URL, "/api/auth/callback/github"),
},
google: {
  redirectURI: joinUrl(env.SERVER_URL, "/api/auth/callback/google"),
},
```

## Verification

1. `pnpm deploy:server` -- deploys successfully
2. `curl https://server.yourdomain.com/api/health` -- returns 200
3. Build a production native app and test sign-in
4. RevenueCat dashboard: send a test webhook event -- server should return 200
5. Test email verification -- links should contain the production `SERVER_URL`

## Common Mistakes

- **Deploying without running production migrations first** -- The server starts but auth/payments fail with "table not found" errors. Always run `pnpm db:migrate` before `pnpm deploy:server`.
- **Forgetting `REVENUECAT_WEBHOOK_SECRET`** -- RevenueCat webhook calls return 500 with "Missing REVENUECAT_WEBHOOK_SECRET". Push it via `wrangler secret put REVENUECAT_WEBHOOK_SECRET`.
- **`SERVER_URL` in wrangler vars still pointing to the template default** -- Email links, auth callbacks, and RevenueCat webhook validation all use `SERVER_URL`. If it still says `https://server.easystarter.dev`, production auth will redirect to the wrong domain.
- **EAS env still pointing to template server** -- The native app bakes `EXPO_PUBLIC_SERVER_API_URL` at build time. If `eas.json` still has the template URL, production builds will call the template server, not yours.
- **Pushing `.env.production` to git** -- This file contains all secrets. Add it to `.gitignore` if it's not already there. Use `pnpm -F server secrets:bulk:production` to push secrets to Cloudflare, not to version control.
