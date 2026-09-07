---
name: easystarter-web-deploy-server
description: "Deploy EasyStarter Server to Cloudflare Workers. Use when the user says 'deploy server', 'push to production', 'cloudflare deploy', or asks about production secrets, D1 migrations, or post-deploy URL sync for OAuth/webhooks."
---

# EasyStarter Web Deploy Server

Deploy the API Worker to Cloudflare. Server must deploy before Web so auth callbacks, webhooks, storage URLs, and the service binding target exist.

## Decision Tree

```
User wants to deploy server ->
  First deploy ever              -> Section: Full Pre-Deploy Checklist
  "deploy failed"                -> Section: Common Mistakes
  "secrets not working"          -> Section: Production Secrets
  "need to run migrations"       -> Section: Production Migrations
  "OAuth/webhook URLs broken"    -> Section: Post-Deploy URL Sync
  Already deployed, just update  -> pnpm deploy:server (skip migrations if schema unchanged)
```

## Full Pre-Deploy Checklist

### 1. Verify wrangler.jsonc

`apps/server/wrangler.jsonc` must have production URLs and bindings:

```jsonc
{
  "name": "easystarter-server",
  "d1_databases": [{
    "binding": "DB",
    "database_name": "easysaas-db",
    "database_id": "YOUR_D1_DATABASE_ID"
  }],
  "vars": {
    "NODE_ENV": "production",
    "WEBSITE_URL": "https://your-web-domain.com",
    "SERVER_URL": "https://your-server-domain.com",
    "GOOGLE_CLIENT_ID": "YOUR_ID.apps.googleusercontent.com",
    "GITHUB_CLIENT_ID": "Ov23li..."
  },
  "r2_buckets": [{
    "binding": "STORAGE",
    "bucket_name": "easysaas-bucket"
  }],
  "triggers": {
    "crons": ["10 16 * * *"]         // daily credit maintenance
  }
}
```

The `vars` section contains ONLY public, non-sensitive values. Secrets go via `wrangler secret`.

### 2. Prepare `.env.production`

```bash
cp apps/server/.dev.vars apps/server/.env.production
```

Edit `.env.production` -- it needs TWO categories of values:

**Migration credentials** (used by `pnpm db:migrate`, not uploaded to Workers):

```
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_D1_DATABASE_ID=your_database_id
```

**Runtime secrets** (uploaded to Workers via `secrets:bulk:production`):

```
BETTER_AUTH_SECRET=your_production_secret
GOOGLE_CLIENT_SECRET=GOCSPX-...
GITHUB_CLIENT_SECRET=ghs_...
RESEND_API_KEY=re_...
R2_PUBLIC_URL=https://pub-xxx.r2.dev
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Push secrets to Cloudflare

```bash
pnpm -F server secrets:bulk:production
```

This runs `wrangler secret bulk .env.production`, uploading all key-value pairs as encrypted Worker secrets.

### 4. Run production migrations

```bash
pnpm db:migrate
```

Uses `apps/server/drizzle.config.ts` with `d1-http` driver:

```typescript
export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId,     // from .env.production
    databaseId,    // from .env.production
    token,         // from .env.production
  },
});
```

### 5. Deploy

```bash
pnpm deploy:server
```

This runs `turbo -F server deploy` which executes `wrangler deploy`.

## Production Secrets

Full list from `apps/server/.env.production.example`:

| Secret | Required | Purpose |
|--------|----------|---------|
| `BETTER_AUTH_SECRET` | Yes | Session token signing |
| `GOOGLE_CLIENT_SECRET` | If Google auth enabled | Google OAuth |
| `GITHUB_CLIENT_SECRET` | If GitHub auth enabled | GitHub OAuth |
| `APPLE_APP_BUNDLE_IDENTIFIER` | If Apple auth enabled | Apple Sign In |
| `RESEND_API_KEY` | If email enabled | Transactional email |
| `R2_PUBLIC_URL` | If storage enabled | Public URL for stored files |
| `STRIPE_SECRET_KEY` | If Stripe enabled | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | If Stripe enabled | Webhook signature verification |
| `REVENUECAT_WEBHOOK_SECRET` | If native IAP enabled | RevenueCat webhook auth |

## Post-Deploy URL Sync

After deploying, update callback URLs in provider dashboards.

### OAuth callback URLs

The server constructs callbacks from `SERVER_URL` in `apps/server/src/lib/auth.ts`:

```typescript
socialProviders: {
  github: {
    redirectURI: joinUrl(env.SERVER_URL, "/api/auth/callback/github"),
  },
  google: {
    redirectURI: joinUrl(env.SERVER_URL, "/api/auth/callback/google"),
  },
},
```

Update in provider dashboards:
- **Google**: https://console.cloud.google.com/apis/credentials
  - Add: `https://YOUR_SERVER_DOMAIN/api/auth/callback/google`
- **GitHub**: https://github.com/settings/developers
  - Add: `https://YOUR_SERVER_DOMAIN/api/auth/callback/github`

### Webhook URLs

Webhook handlers are registered in `apps/server/src/index.ts`:

```typescript
app.post("/api/webhooks/stripe", ...);      // Stripe
app.post("/api/webhooks/revenuecat", ...);  // RevenueCat
```

Update in provider dashboards:
- **Stripe**: `https://YOUR_SERVER_DOMAIN/api/webhooks/stripe`
- **RevenueCat**: `https://YOUR_SERVER_DOMAIN/api/webhooks/revenuecat`

### Cron trigger

The server runs daily credit maintenance via Cloudflare Cron Trigger:

```typescript
// apps/server/src/index.ts
export default {
  async scheduled(_controller, env) {
    const db = createDb(env.DB);
    await runCreditMaintenance(db);
  },
} satisfies ExportedHandler<Cloudflare.Env>;
```

Configured in wrangler.jsonc:

```jsonc
"triggers": { "crons": ["10 16 * * *"] }   // daily at 16:10 UTC
```

## Common Mistakes

| Mistake | Why It Happens | Fix |
|---------|---------------|-----|
| Deploy succeeds but auth fails | `BETTER_AUTH_SECRET` not in production secrets | `pnpm -F server secrets:bulk:production` |
| "table not found" errors | Forgot production migrations before/after schema change | `pnpm db:migrate` |
| Google OAuth "redirect_uri_mismatch" | Production callback URL not in Google Console | Add `https://SERVER_URL/api/auth/callback/google` |
| Stripe webhook returns 400 | `STRIPE_WEBHOOK_SECRET` mismatch | Copy signing secret from Stripe Dashboard > Webhooks |
| `wrangler deploy` fails with "missing binding" | `d1_databases` or `r2_buckets` not in wrangler.jsonc | Add bindings, then `pnpm -F server cf-typegen` |
| Secrets from `.dev.vars` leak to production | Ran `secrets:bulk` against `.dev.vars` instead of `.env.production` | The script targets `.env.production` specifically |
| Custom domain not serving | Cloudflare Workers custom domain not configured | Set up custom domain in Workers dashboard > Triggers > Custom Domains |

## Verification Checklist

- [ ] `pnpm db:migrate` completes successfully
- [ ] `pnpm -F server secrets:bulk:production` uploads without errors
- [ ] `pnpm deploy:server` succeeds
- [ ] `curl https://YOUR_SERVER_DOMAIN/` returns `{"status":"ok"}`
- [ ] OAuth callback URLs updated in Google/GitHub dashboards
- [ ] Stripe webhook endpoint updated and verified
- [ ] Test sign-in via production URL works
