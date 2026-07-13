---
name: easystarter-mobile-cloudflare
description: "Configure Cloudflare credentials for EasyStarter Mobile Server. Use whenever the user needs to set up Cloudflare for mobile, configure wrangler for the API server, set SERVER_URL/WEBSITE_URL, create D1/R2 resources, connect the native app to the deployed server, or says 'cloudflare setup for mobile', 'wrangler config', 'server URL for native', 'mobile can't reach API'."
---

# EasyStarter Mobile Cloudflare

Mobile doesn't have its own Cloudflare Worker -- it shares the same server as web (`apps/server`). This skill covers configuring that shared server from the mobile perspective, then pointing the native app at it.

## Decision Tree

- **First-time Cloudflare setup** --> Sections 1-4 in order
- **Server already deployed, connecting native to it** --> Section 4 (EAS env)
- **Need D1 database** --> Use `easystarter-mobile-database` skill
- **Need R2 storage** --> Section 3 (R2 binding in wrangler)
- **Deploying server to production** --> Use `easystarter-mobile-deploy-server` skill

## Section 1: Wrangler Config

The server Worker config lives in `apps/server/wrangler.jsonc`:

```jsonc
// apps/server/wrangler.jsonc
{
  "name": "easystarter-server",
  "main": "src/index.ts",
  "compatibility_date": "2025-06-15",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "easysaas-db",
      "database_id": "5d06ae22-22dc-42a4-b6fc-4a53720c9f69"
    }
  ],
  "vars": {
    "NODE_ENV": "production",
    "WEBSITE_URL": "https://cf.easystarter.dev",
    "SERVER_URL": "https://server.easystarter.dev",
    "GITHUB_CLIENT_ID": "Ov23liJZZtODJ0YsClHs",
    "GOOGLE_CLIENT_ID": "895860292632-...apps.googleusercontent.com"
  },
  "r2_buckets": [
    {
      "binding": "STORAGE",
      "bucket_name": "easysaas-bucket"
    }
  ]
}
```

**Fields to customize:**
- `name` -- Worker name (becomes `{name}.{account}.workers.dev`)
- `d1_databases[0].database_name` and `database_id` -- from `wrangler d1 create`
- `vars.SERVER_URL` -- your deployed server URL
- `vars.WEBSITE_URL` -- your deployed web app URL
- `vars.GITHUB_CLIENT_ID` / `vars.GOOGLE_CLIENT_ID` -- your OAuth app client IDs
- `r2_buckets[0].bucket_name` -- from R2 bucket creation

Public IDs go in `vars`. Secrets go in `.dev.vars` (local) or `.env.production` (production).

## Section 2: Server Secrets

Secrets needed by the server live in `apps/server/.dev.vars` for local dev:

| Variable | Purpose | How to Get |
|----------|---------|-----------|
| `BETTER_AUTH_SECRET` | Session signing | `openssl rand -base64 32` |
| `CLOUDFLARE_ACCOUNT_ID` | D1/R2 API access | Cloudflare dashboard > Account ID |
| `CLOUDFLARE_API_TOKEN` | D1/R2 API access | Cloudflare dashboard > API Tokens > Create |
| `CLOUDFLARE_D1_DATABASE_ID` | Drizzle migrations | From `wrangler d1 create` output |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Google Cloud Console |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | GitHub Developer Settings |
| `APPLE_APP_BUNDLE_IDENTIFIER` | Apple Sign-In verification | Must match `app.json` `ios.bundleIdentifier` |
| `RESEND_API_KEY` | Email sending | Resend dashboard |
| `R2_PUBLIC_URL` | Public file access | Your R2 custom domain or `pub-xxx.r2.dev` |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat webhook auth | RevenueCat dashboard > Webhooks |

Create from example:
```bash
cp apps/server/.dev.vars.example apps/server/.dev.vars
```

For production, create `apps/server/.env.production` and push secrets:
```bash
pnpm -F server secrets:bulk:production
# This runs: wrangler secret bulk .env.production
```

## Section 3: D1 and R2 Resources

**Create D1 database:**
```bash
pnpm -F server wrangler d1 create your-db-name
# Outputs database_id — put this in wrangler.jsonc d1_databases[0].database_id
# Also put it in .dev.vars as CLOUDFLARE_D1_DATABASE_ID
```

**Create R2 bucket:**
```bash
pnpm -F server wrangler r2 bucket create your-bucket-name
# Put the bucket name in wrangler.jsonc r2_buckets[0].bucket_name
```

After updating bindings, regenerate Worker types:
```bash
pnpm -F server cf-typegen
```

## Section 4: Connecting Native to Server

The native app needs `EXPO_PUBLIC_SERVER_API_URL` pointing to the server.

**For local development** (`apps/native/.env.development.local`):
```
EXPO_PUBLIC_SERVER_API_URL=http://localhost:3001
```

**For EAS cloud builds** (`apps/native/eas.json`):
```jsonc
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_SERVER_API_URL": "https://server.easystarter.dev",
        "EXPO_PUBLIC_WEB_APP_URL": "https://cf.easystarter.dev"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_SERVER_API_URL": "https://server.easystarter.dev",
        "EXPO_PUBLIC_WEB_APP_URL": "https://cf.easystarter.dev"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SERVER_API_URL": "https://server.easystarter.dev",
        "EXPO_PUBLIC_WEB_APP_URL": "https://cf.easystarter.dev"
      }
    }
  }
}
```

The native app reads this URL in:
```typescript
// apps/native/lib/orpc.ts
export const baseUrl = process.env.EXPO_PUBLIC_SERVER_API_URL;
if (!baseUrl) {
  throw new Error("EXPO_PUBLIC_SERVER_API_URL is required");
}
```

## Verification

1. `pnpm dev:server` -- should start Wrangler on port 3001 without binding errors
2. `pnpm -F server cf-typegen` -- should complete without errors after binding changes
3. `pnpm dev:native+server` -- native app should reach the server API
4. For production: `pnpm deploy:server` then test with a production EAS build

## Common Mistakes

- **Putting secrets in `wrangler.jsonc` vars** -- `vars` in wrangler are public (committed to git). Secrets like `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `REVENUECAT_WEBHOOK_SECRET` must go in `.dev.vars` (local) or `.env.production` (production, pushed via `wrangler secret bulk`).
- **Mismatched `database_id`** -- The `database_id` in `wrangler.jsonc` is for the production D1 binding. The `CLOUDFLARE_D1_DATABASE_ID` in `.dev.vars` / `.env.production` is used by `drizzle-kit` for migrations. They must be the same database unless you intentionally have separate staging/production databases.
- **Forgetting `APPLE_APP_BUNDLE_IDENTIFIER`** -- Apple Sign-In on native uses idToken verification, which checks the token audience against this value. Without it, Apple Sign-In appears to work (the native Apple dialog shows) but the server rejects the token.
- **Using the Workers.dev URL as SERVER_URL when you have a custom domain** -- Auth callbacks, email links, and RevenueCat webhooks are configured with `SERVER_URL`. If you later add a custom domain, you need to update `SERVER_URL` in wrangler vars AND re-register webhooks/callbacks with providers.
