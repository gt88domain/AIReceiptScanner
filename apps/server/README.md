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

# 3. Upload secrets to the default worker (tanstack-template-server)
pnpm run secrets:bulk:production

# 4A. Deploy default worker (same worker name)
pnpm run deploy:dev

# 4B. Deploy env worker (new worker name: tanstack-template-server-production)
#     Use this only if you intentionally manage a separate production worker
#     and already configured secrets/bindings for that env worker
pnpm run deploy
```

### Deployment Modes

This repository currently supports two deployment modes:

1. **Single worker mode (recommended for now)**
   - Worker name: `tanstack-template-server`
   - Secret upload: `pnpm run secrets:bulk:production`
   - Deploy command: `pnpm run deploy:dev`

2. **Environment worker mode**
   - Worker name: `tanstack-template-server-production` (triggered by `--env production`)
   - Deploy command: `pnpm run deploy`
   - You must separately configure secrets and bindings for this worker.

### Common Errors

1. `There doesn't seem to be a Worker called "tanstack-template-server-production"`
   - Cause: using `--env production` creates/targets a different worker name.
   - Fix: use `pnpm run deploy:dev` if you want the original worker.

2. `Binding name 'GITHUB_CLIENT_ID' already in use`
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
│   ├── lib/               # Core libraries
│   │   ├── auth.ts        # Better Auth config
│   │   ├── context.ts     # Request context
│   │   ├── orpc.ts        # oRPC setup
│   ├── db/                # Database
│   │   ├── index.ts       # Drizzle client
│   │   ├── schema/        # Table schemas
│   │   └── migrations/    # D1 migrations
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

| Script                             | Description                                           |
| ---------------------------------- | ----------------------------------------------------- |
| `pnpm run setup`                   | One-click environment setup                           |
| `pnpm run dev`                     | Start local dev server (port 3001)                    |
| `pnpm run dev:init-d1`             | Initialize local D1 sqlite without starting server    |
| `pnpm run deploy`                  | Deploy to env worker (`--env production`)             |
| `pnpm run deploy:dev`              | Deploy to default worker (`tanstack-template-server`) |
| `pnpm run secrets:bulk:production` | Bulk upload production envs from `.env.production`    |
| `pnpm run db:generate`             | Generate DB migration                                 |
| `pnpm run db:migrate:local`        | Initialize local D1 if needed, then run migrations    |
| `pnpm run db:studio:local`         | Initialize local D1 if needed, then open studio       |
| `pnpm run db:push`                 | Push schema to D1                                     |
| `pnpm run db:studio`               | Open Drizzle Studio                                   |
| `pnpm run generate-types`          | Generate Cloudflare types                             |

## 📚 Related Docs

- `../../docs/native-email-verification-with-ngrok.md` — Test native email verification with a public HTTPS tunnel
