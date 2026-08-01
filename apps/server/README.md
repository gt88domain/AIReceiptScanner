# Server

Hono + Cloudflare Workers + D1 backend service.

## 🚀 Quick Start

### Development

```bash
# 1. One-click setup (creates .dev.vars + sets Cloudflare secrets)
pnpm run setup

# 2. Start local dev server
pnpm run dev
```

### Production Deployment

```bash
# 1. Prepare production env file
cp .env.production.example .env.production

# 2. Fill real production values in .env.production
#    Keep ONLY secret values if the same key already exists in wrangler.jsonc vars
#    (for this repo: GITHUB_CLIENT_ID / GOOGLE_CLIENT_ID are in wrangler.jsonc vars)

# 3. Declare the exact production resources this checkout may deploy to
cp .production-safety.example .production-safety.env

# 4. Upload secrets to the configured Worker
pnpm run secrets:bulk:production

# 5. Validate both Workers, then deploy
pnpm run deploy
```

### Common Errors

1. `Binding name 'GITHUB_CLIENT_ID' already in use`
   - Cause: same key exists in both `wrangler.jsonc -> vars` and uploaded secrets.
   - Fix: remove duplicated keys from `.env.production` before `secret bulk`, or remove that key from `wrangler.jsonc vars` and keep it only in secrets.

`pnpm run setup` will:

- Auto-generate `BETTER_AUTH_SECRET`
- Prompt for OAuth credentials (optional)
- Create `.dev.vars` for local development
- Set Cloudflare secrets for production

## 📁 Directory Structure

```
apps/server/
├── src/
│   ├── index.ts           # App entry point
│   ├── handlers/          # Request handlers
│   │   ├── api.ts         # OpenAPI handler
│   │   └── rpc.ts         # oRPC handler
│   ├── middlewares/       # Hono middlewares
│   │   ├── cors.ts        # CORS config
│   │   ├── error.ts       # Error handler
│   │   └── session.ts     # Auth session
│   ├── routers/           # API routes (oRPC)
│   │   └── index.ts
│   ├── modules/           # Product domain modules and router registry
│   ├── lib/               # Core libraries
│   │   ├── auth.ts        # Better Auth config
│   │   ├── context.ts     # Request context
│   │   ├── orpc.ts        # oRPC setup
│   ├── db/                # Database
│   │   ├── index.ts       # Drizzle client
│   │   ├── schema/        # Table schemas
│   │   ├── migrations/    # D1 structural migrations
│   │   ├── data-migrations/ # Versioned data transformations
│   │   ├── seeds/         # Rebuildable local/demo data
│   │   ├── backfills/     # Historical field population
│   │   └── repairs/       # Scoped data incident repairs
│   └── utils/             # Utilities
├── scripts/
│   └── setup.mjs          # Environment setup
├── wrangler.jsonc         # Cloudflare config
└── .dev.vars              # Local env (generated)
```

## 🗄️ Database

Using Cloudflare D1 (SQLite) with Drizzle ORM.

```bash
# Generate migration
pnpm run db:generate

# Push schema to D1
pnpm run db:push

# Apply migrations to local D1 (auto-initializes sqlite if needed)
pnpm run db:migrate:local

# Open local Drizzle Studio (auto-initializes sqlite if needed)
pnpm run db:studio:local

# Open Drizzle Studio
pnpm run db:studio
```

Local migrations use `drizzle.local.config.ts` and target the local D1
sqlite file under `.wrangler/state/v3/d1/`. `pnpm run db:migrate:local`
and `pnpm run db:studio:local` now initialize that sqlite automatically.

See `src/db/README.md` before adding any database operation. Structural
migrations, imports, seeds, backfills, and repairs have separate lifecycles.

## 🚧 Production deployment guard

`pnpm run deploy` stops before upload unless the Server and Web Worker identities,
service binding, D1 database, R2 bucket, queues, and public URLs match the local
production allowlist. It also checks `ADMIN_EMAILS`, `BETTER_AUTH_SECRET`, the
configured Resend sender, and secrets for providers enabled by app config.

Before the first production deploy:

```bash
cp .production-safety.example .production-safety.env
# Fill the exact production API/Web Worker, D1, R2, Queue, and URL values.
pnpm run preflight:production
```

The safety file is ignored by Git. Keep `.env.production` for secrets and
Cloudflare migration credentials; do not commit either file.

## 🔒 Authorization guards

Use `src/auth/guards` for new server authorization instead of inspecting
session, `ADMIN_EMAILS`, or billing records in routers. It provides
`requireUser`, `requireAdmin`, `requireCapability`, and `requireEntitlement`.
See `src/auth/README.md` for the boundary rules.

## ⚙️ Product foundations

- `src/modules/capabilities` maps named product features to minimum verified
  membership tiers. Add feature requirements in `packages/app-config/src/app-config.ts`.
- `src/modules/jobs` uses D1 state plus a Cloudflare Queue outbox for short,
  retryable work. Before the first deploy, create the configured queue:

  ```bash
  pnpm exec wrangler queues create <production-job-queue>
  ```

  Use Cloudflare Workflows directly for long-running, multi-step processes.

- `src/modules/assets` stores ownership and visibility metadata for objects in
  R2 or another storage provider.

## 🔐 Environment Variables

| Variable                    | Description                          | Where                                   |
| --------------------------- | ------------------------------------ | --------------------------------------- |
| `BETTER_AUTH_SECRET`        | Auth encryption key                  | `.env.production` -> Secret             |
| `GITHUB_CLIENT_ID`          | GitHub OAuth ID                      | `wrangler.jsonc` vars (current default) |
| `GITHUB_CLIENT_SECRET`      | GitHub OAuth secret                  | `.env.production` -> Secret             |
| `GOOGLE_CLIENT_ID`          | Google OAuth ID                      | `wrangler.jsonc` vars (current default) |
| `GOOGLE_CLIENT_SECRET`      | Google OAuth secret                  | `.env.production` -> Secret             |
| `STRIPE_SECRET_KEY`         | Stripe secret key                    | `.env.production` -> Secret             |
| `STRIPE_WEBHOOK_SECRET`     | Stripe webhook key                   | `.env.production` -> Secret             |
| `CREEM_API_KEY`             | Creem API key                        | `.env.production` -> Secret             |
| `CREEM_WEBHOOK_SECRET`      | Creem webhook key                    | `.env.production` -> Secret             |
| `WAFFO_MERCHANT_ID`         | Waffo Merchant ID                    | `.env.production` -> Secret             |
| `WAFFO_PRIVATE_KEY`         | Waffo private key                    | `.env.production` -> Secret             |
| `WAFFO_ENVIRONMENT`         | Waffo environment (`test` or `prod`) | `.env.production` -> Secret             |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat webhook key               | `.env.production` -> Secret             |

- **Local development**: `.dev.vars` (loaded by `wrangler dev`)
- **Production secrets**: `.env.production` + `wrangler secret bulk .env.production`
- **Avoid duplicate binding names** between `wrangler.jsonc vars` and secret bulk file

## 📝 Available Scripts

| Script                             | Description                                                 |
| ---------------------------------- | ----------------------------------------------------------- |
| `pnpm run setup`                   | One-click environment setup                                 |
| `pnpm run dev`                     | Start local dev server (port 3001)                          |
| `pnpm run dev:init-d1`             | Initialize local D1 sqlite without starting server          |
| `pnpm run deploy`                  | Run the production guard, then deploy the configured Worker |
| `pnpm run preflight:production`    | Validate production resources and required secrets          |
| `pnpm run deploy:dev`              | Deploy without the production guard (development only)      |
| `pnpm run secrets:bulk:production` | Bulk upload production envs from `.env.production`          |
| `pnpm run db:generate`             | Generate DB migration                                       |
| `pnpm run db:migrate:local`        | Initialize local D1 if needed, then run migrations          |
| `pnpm run db:studio:local`         | Initialize local D1 if needed, then open studio             |
| `pnpm run db:push`                 | Push schema to D1                                           |
| `pnpm run db:studio`               | Open Drizzle Studio                                         |
| `pnpm run generate-types`          | Generate Cloudflare types                                   |

## 📚 Related Docs

- `src/modules/README.md` — Product-domain module ownership and router registration
- `src/db/README.md` — Schema, data migration, seed, backfill, and repair rules
- `../../docs/native-email-verification-with-ngrok.md` — Test native email verification with a public HTTPS tunnel
