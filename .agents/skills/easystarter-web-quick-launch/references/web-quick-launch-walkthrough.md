# Web Quick Launch -- Full Walkthrough

Step-by-step guide to go from zero to production with Cloudflare + Google auth + Stripe + R2.

---

## Step 1: Cloudflare Account + D1 Database

### 1a. Get Cloudflare credentials

1. Log into https://dash.cloudflare.com
2. Copy your Account ID from the sidebar (or URL: `dash.cloudflare.com/<ACCOUNT_ID>`)
3. Create an API token at https://dash.cloudflare.com/profile/api-tokens
   - Use "Edit Cloudflare Workers" template
   - Add D1 + R2 permissions if not included

### 1b. Create D1 database

```bash
# Login to Wrangler (one-time)
pnpm wrangler login

# Create the database
pnpm wrangler d1 create easysaas-db
# Output includes the database_id -- copy it
```

### 1c. Update wrangler.jsonc

Edit `apps/server/wrangler.jsonc` -- update the `d1_databases` section:

```jsonc
"d1_databases": [{
  "binding": "DB",
  "database_name": "easysaas-db",
  "database_id": "YOUR_NEW_DATABASE_ID"    // <-- paste here
}]
```

### 1d. Set credentials in env files

In `apps/server/.dev.vars`:

```
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_D1_DATABASE_ID=your_database_id
```

Copy the same three values to `apps/server/.env.production` for remote migrations.

### 1e. Run local migrations

```bash
pnpm db:migrate:local
```

This initializes the local D1 SQLite file at `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`.

---

## Step 2: Google OAuth

### 2a. Create OAuth credentials

1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs:
   - Local: `http://localhost:3001/api/auth/callback/google`
   - Production: `https://YOUR_SERVER_DOMAIN/api/auth/callback/google`
4. Copy the Client ID and Client Secret

### 2b. Set credentials

In `apps/server/wrangler.jsonc` vars (public, committed):

```jsonc
"GOOGLE_CLIENT_ID": "YOUR_CLIENT_ID.apps.googleusercontent.com"
```

In `apps/server/.dev.vars` (secret, local only):

```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YOUR_SECRET
```

### 2c. Enable in app-config

In `packages/app-config/src/app-config.ts`, confirm:

```typescript
auth: {
  methods: {
    googleEnabled: true,
  },
},
```

The server reads this config and the env vars together in `apps/server/src/lib/auth.ts`:

```typescript
socialProviders: {
  google: {
    prompt: "select_account",
    enabled: commonConfig.auth.methods.googleEnabled ?? false,
    clientId: env.GOOGLE_CLIENT_ID || "",
    clientSecret: env.GOOGLE_CLIENT_SECRET || "",
    redirectURI: joinUrl(env.SERVER_URL, "/api/auth/callback/google"),
  },
},
```

---

## Step 3: Stripe Products + Webhook

### 3a. Create Stripe products

1. In https://dashboard.stripe.com/products, create products:
   - **Pro Monthly** subscription ($10/mo with 7-day trial)
   - **Pro Yearly** subscription ($100/yr with 7-day trial)
   - **Lifetime** one-time payment ($2000)
2. Copy each Price ID (`price_...`)

### 3b. Update app-config price IDs

In `packages/app-config/src/app-config.ts`, update the `payments.plans` array:

```typescript
payments: {
  enabled: true,
  provider: "stripe",
  plans: [
    { id: "free" },
    {
      id: "pro",
      prices: [
        {
          id: "monthly",
          provider: "stripe",
          test: { providerPriceId: "price_YOUR_TEST_MONTHLY" },
          prod: { providerPriceId: "price_YOUR_PROD_MONTHLY" },
          currency: "usd",
          amountCents: 1000,
          priceType: "subscription",
          interval: "month",
          trialDays: 7,
          status: "active",
        },
        {
          id: "yearly",
          provider: "stripe",
          test: { providerPriceId: "price_YOUR_TEST_YEARLY" },
          prod: { providerPriceId: "price_YOUR_PROD_YEARLY" },
          currency: "usd",
          amountCents: 10000,
          priceType: "subscription",
          interval: "year",
          trialDays: 7,
          status: "active",
        },
      ],
    },
    {
      id: "lifetime",
      prices: [{
        id: "lifetime",
        provider: "stripe",
        test: { providerPriceId: "price_YOUR_TEST_LIFETIME" },
        prod: { providerPriceId: "price_YOUR_PROD_LIFETIME" },
        currency: "usd",
        amountCents: 200000,
        priceType: "lifetime",
        status: "active",
      }],
    },
  ],
},
```

### 3c. Configure Stripe webhook

1. In Stripe Dashboard > Webhooks, add endpoint:
   - URL: `https://YOUR_SERVER_DOMAIN/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
2. Copy the webhook signing secret (`whsec_...`)

### 3d. Set Stripe secrets

In `apps/server/.dev.vars`:

```
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
```

For local webhook testing, use Stripe CLI:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
# Use the whsec_ output as STRIPE_WEBHOOK_SECRET locally
```

---

## Step 4: R2 Storage Bucket

### 4a. Create R2 bucket

```bash
pnpm wrangler r2 bucket create easysaas-bucket
```

Or create via Cloudflare dashboard > R2.

### 4b. Enable public access

In R2 bucket settings, enable public access and copy the public URL (`https://pub-xxx.r2.dev`).

### 4c. Update config

In `apps/server/wrangler.jsonc` (already present by default):

```jsonc
"r2_buckets": [{
  "binding": "STORAGE",
  "bucket_name": "easysaas-bucket"
}]
```

In `apps/server/.dev.vars`:

```
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

Storage config in `packages/app-config/src/app-config.ts`:

```typescript
storage: {
  enabled: true,
  provider: "r2",
  publicPath: "/api/storage",
  keyPrefixes: { avatar: "avatars", attachment: "attachments" },
  fallbackPrefix: "files",
  allowedTypes: {
    avatar: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    attachment: ["image/jpeg", "image/png", "image/gif", "image/webp",
                 "application/pdf", "text/plain"],
  },
  maxFileSizes: {
    avatar: 5 * 1024 * 1024,       // 5MB
    attachment: 25 * 1024 * 1024,   // 25MB
  },
},
```

---

## Step 5: App Config + DB Push

### 5a. Customize app metadata

In `packages/app-config/src/app-config.ts`, update the `common.app` section:

```typescript
app: {
  name: "YourAppName",
  nativeScheme: "yourapp-native",
  supportEmail: "support@yourdomain.com",
  websiteUrl: "https://www.yourdomain.com",
  socialUrl: "https://x.com/yourhandle",
  appStoreUrl: "https://apps.apple.com/app/id...",
},
```

### 5b. Update email sender

```typescript
email: {
  provider: "resend",
  from: {
    localPart: "noreply",
    domain: "yourdomain.com",    // must be verified in Resend
  },
},
```

### 5c. Push DB schema locally

```bash
pnpm db:migrate:local
```

### 5d. Type check

```bash
pnpm check-types
```

---

## Step 6: Local Verification

### 6a. Create local env files

```bash
cp apps/web/.env.development.example apps/web/.env.development
cp apps/server/.dev.vars.example apps/server/.dev.vars
```

Ensure local URLs:

```
# apps/web/.env.development
VITE_SERVER_URL=http://localhost:3001
VITE_APP_URL=http://localhost:3000

# apps/server/.dev.vars
SERVER_URL=http://localhost:3001
WEBSITE_URL=http://localhost:3000
```

### 6b. Start and test

```bash
pnpm dev:web+server
```

Verify:
1. Open http://localhost:3000 -- landing page loads
2. Click "Sign In" -- Google OAuth redirects and returns
3. Open billing -- Stripe checkout session creates
4. Upload a file -- R2 storage works
5. Check http://localhost:3001/ -- returns `{"status":"ok"}`

---

## Step 7: Deploy

### 7a. Prepare production secrets

```bash
cp apps/server/.dev.vars apps/server/.env.production
# Edit .env.production: swap test keys for production keys
# Remove CLOUDFLARE_* (only needed for migrations, not runtime)
# Remove GITHUB_CLIENT_ID, GOOGLE_CLIENT_ID (those go in wrangler.jsonc vars)
```

Push secrets to Cloudflare:

```bash
pnpm -F server secrets:bulk:production
```

### 7b. Run production DB migrations

```bash
pnpm db:migrate
```

This uses `apps/server/drizzle.config.ts` which reads from `.env.production`:

```typescript
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
```

### 7c. Update production URLs in wrangler.jsonc

`apps/server/wrangler.jsonc`:

```jsonc
"vars": {
  "NODE_ENV": "production",
  "WEBSITE_URL": "https://your-web-domain.com",
  "SERVER_URL": "https://your-server-domain.com",
  "GOOGLE_CLIENT_ID": "YOUR_PRODUCTION_CLIENT_ID.apps.googleusercontent.com"
}
```

`apps/web/wrangler.jsonc`:

```jsonc
"services": [{
  "binding": "API_SERVICE",
  "service": "easystarter-server"   // must match server wrangler name
}],
"vars": {
  "VITE_SERVER_URL": "https://your-server-domain.com",
  "VITE_APP_URL": "https://your-web-domain.com"
}
```

### 7d. Deploy server first, then web

```bash
pnpm deploy:server
pnpm deploy:web
```

Server must deploy first because:
- Web's service binding references the server worker
- Auth callbacks, webhooks, and storage URLs must resolve

### 7e. Post-deploy URL sync

Update callback URLs in provider dashboards:
- **Google Cloud Console**: add `https://YOUR_SERVER_DOMAIN/api/auth/callback/google`
- **GitHub Developer Settings**: add `https://YOUR_SERVER_DOMAIN/api/auth/callback/github`
- **Stripe Webhooks**: update endpoint to `https://YOUR_SERVER_DOMAIN/api/webhooks/stripe`

### 7f. Verify production

```bash
curl https://YOUR_SERVER_DOMAIN/
# {"status":"ok","service":"easystarter API","version":"1.0.0","timestamp":"..."}
```

Visit `https://YOUR_WEB_DOMAIN/` and test:
1. Landing page renders
2. Google sign-in works
3. Billing checkout creates session
4. Dashboard loads after auth
