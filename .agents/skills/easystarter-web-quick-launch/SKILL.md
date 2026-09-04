---
name: easystarter-web-quick-launch
description: "Configure the recommended minimal EasyStarter Web launch path end-to-end. Use whenever the user wants to go live fast, first production setup, minimal viable launch, Google login + Stripe + R2, Cloudflare deployment, or says 'help me launch', 'go live', 'first deploy', 'quick start production'."
---

# EasyStarter Web Quick Launch

Ship the smallest coherent Web production: Cloudflare Workers, D1, R2, Google auth, Stripe billing, deploy.

## Decision Tree

```
User wants to launch ->
  "just deploy" / already configured -> Jump to Step 6-7 in walkthrough
  "set up everything from scratch"   -> Load references/web-quick-launch-walkthrough.md
  "only database" / "only Cloudflare"-> Use easystarter-web-cloudflare-d1 skill
  "only deploy server"               -> Use easystarter-web-deploy-server skill
  "only deploy web"                   -> Use easystarter-web-deploy-web skill
  "local dev first"                   -> Use easystarter-web-dev-start skill
  Specific provider (Stripe/auth/R2) -> Jump to that step in walkthrough
```

## Launch Steps Overview

The full walkthrough lives in `references/web-quick-launch-walkthrough.md`. Here is the summary:

| Step | What | Key File(s) |
|------|------|-------------|
| 1 | Cloudflare account + API token + D1 database | `apps/server/wrangler.jsonc`, `.dev.vars` |
| 2 | Google OAuth credentials | Google Cloud Console, `wrangler.jsonc` vars, `.dev.vars` |
| 3 | Stripe products + webhook | Stripe Dashboard, `.dev.vars`, `packages/app-config/src/app-config.ts` |
| 4 | R2 storage bucket | Cloudflare dashboard, `wrangler.jsonc` r2_buckets, `.dev.vars` |
| 5 | App config + DB schema push | `packages/app-config/src/app-config.ts`, `pnpm db:migrate:local` |
| 6 | Local verification | `pnpm dev:web+server`, test auth + billing + storage |
| 7 | Deploy server then web | `pnpm deploy:server`, `pnpm deploy:web`, post-deploy URL sync |

## Environment Variables Quick Reference

### `apps/server/.dev.vars` (local secrets -- never committed)

| Variable | Purpose | Example |
|----------|---------|---------|
| `BETTER_AUTH_SECRET` | Session signing key | `openssl rand -base64 32` output |
| `CLOUDFLARE_ACCOUNT_ID` | CF account for D1/R2 API calls | `abcdef1234567890` |
| `CLOUDFLARE_API_TOKEN` | CF API token (D1 + R2 permissions) | `Sn3...` |
| `CLOUDFLARE_D1_DATABASE_ID` | Target D1 database UUID | `5d06ae22-22dc-...` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-...` |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `RESEND_API_KEY` | Transactional email key | `re_...` |
| `R2_PUBLIC_URL` | Public R2 bucket URL | `https://pub-xxx.r2.dev` |

### `apps/server/wrangler.jsonc` vars (public, committed)

```jsonc
"vars": {
  "NODE_ENV": "production",
  "WEBSITE_URL": "https://cf.easystarter.dev",    // your Web domain
  "SERVER_URL": "https://server.easystarter.dev",  // your Server domain
  "GITHUB_CLIENT_ID": "Ov23li...",
  "GOOGLE_CLIENT_ID": "895860...apps.googleusercontent.com"
}
```

### `apps/web/wrangler.jsonc` vars (public, committed)

```jsonc
"vars": {
  "VITE_SERVER_URL": "https://server.easystarter.dev",
  "VITE_APP_URL": "https://cf.easystarter.dev",
  "VITE_GA_MEASUREMENT_ID": "G-...",
  "VITE_OPENPANEL_CLIENT_ID": "..."
}
```

### Critical wrangler.jsonc bindings

```jsonc
// apps/server/wrangler.jsonc
"d1_databases": [{
  "binding": "DB",
  "database_name": "easysaas-db",
  "database_id": "YOUR_D1_DATABASE_ID"
}],
"r2_buckets": [{
  "binding": "STORAGE",
  "bucket_name": "easysaas-bucket"
}]

// apps/web/wrangler.jsonc -- service binding MUST match server worker name
"services": [{
  "binding": "API_SERVICE",
  "service": "easystarter-server"   // must equal apps/server/wrangler.jsonc "name"
}]
```

## App Config Shape (what to customize)

The central config at `packages/app-config/src/app-config.ts` controls auth methods, payment plans, and credit packages. Key sections for a minimal launch:

```typescript
// Auth methods -- disable what you don't need
auth: {
  methods: {
    emailPasswordEnabled: true,
    emailOtpEnabled: true,
    googleEnabled: true,       // needs GOOGLE_CLIENT_ID + SECRET
    githubEnabled: true,       // needs GITHUB_CLIENT_ID + SECRET
    appleEnabled: true,        // needs Apple developer setup
    smsEnabled: true,          // needs Aliyun SMS credentials
  },
},

// Web payments -- update providerPriceId values from your Stripe dashboard
payments: {
  enabled: true,
  provider: "stripe",
  plans: [
    { id: "free" },
    { id: "pro", prices: [
      { id: "monthly", provider: "stripe",
        test: { providerPriceId: "price_YOUR_TEST_MONTHLY" },
        prod: { providerPriceId: "price_YOUR_PROD_MONTHLY" },
        currency: "usd", amountCents: 1000,
        priceType: "subscription", interval: "month", trialDays: 7 },
      // ... yearly, lifetime
    ]},
  ],
},
```

## Common Mistakes

| Mistake | Why It Happens | Fix |
|---------|---------------|-----|
| Auth cookies fail in production | `SERVER_URL` and `WEBSITE_URL` mismatch or missing HTTPS | Both must use real domains with HTTPS; cookie policy in `auth.ts` derives `sameSite`/`secure` from these URLs |
| Web Worker returns 523/524 errors | Service binding `services[0].service` does not match the deployed server worker name | Ensure `apps/web/wrangler.jsonc` `"service": "easystarter-server"` matches `apps/server/wrangler.jsonc` `"name"` |
| Stripe webhook 400s | Webhook secret mismatch or wrong endpoint URL | Webhook URL is `{SERVER_URL}/api/webhooks/stripe`; secret must match the one in Stripe dashboard |
| D1 "table not found" after deploy | Forgot to run production migrations | Run `pnpm db:migrate` (requires `.env.production` with CF credentials) before first deploy |
| Google OAuth "redirect_uri_mismatch" | Callback URL not registered in Google Cloud Console | Add `{SERVER_URL}/api/auth/callback/google` to authorized redirect URIs |
| R2 files return 404 | `R2_PUBLIC_URL` not set or bucket name mismatch | Set `R2_PUBLIC_URL` in secrets and verify `r2_buckets.bucket_name` in `wrangler.jsonc` |

## Verification Checklist

- [ ] `pnpm dev:web+server` starts without errors (port 3000 + 3001)
- [ ] Sign in with Google works locally
- [ ] Stripe checkout redirects and webhook fires
- [ ] File upload to R2 succeeds and public URL resolves
- [ ] `pnpm deploy:server` succeeds
- [ ] `pnpm deploy:web` succeeds
- [ ] Production Google OAuth callback works
- [ ] Production Stripe webhook receives events
- [ ] `{SERVER_URL}/` returns `{"status":"ok"}`
