---
name: easystarter-mobile-database
description: "Configure Cloudflare D1 database for EasyStarter Mobile Server. Use whenever the user needs to create a D1 database, run migrations, check schema, set up database for mobile auth/payments/credits, debug migration errors, or says 'database setup', 'D1 create', 'run migrations', 'drizzle generate', 'db not working'."
---

# EasyStarter Mobile Database

The mobile app shares the same D1 database as web via the server. Mobile auth, RevenueCat webhook processing, credits, and user profiles all depend on the database being migrated and accessible.

## Decision Tree

- **First-time D1 setup** --> Sections 1-3 in order
- **Schema change (adding/modifying tables)** --> Section 4 (generate + migrate)
- **Local dev database only** --> Section 3 (local migrations)
- **Production database migration** --> Section 5
- **"Table not found" errors** --> Migrations haven't been run. See Section 3 or 5.

## Section 1: Create D1 Database

```bash
cd apps/server
pnpm wrangler d1 create your-database-name
```

Output gives you the `database_id`. Put it in two places:

**1. Wrangler binding** (`apps/server/wrangler.jsonc`):
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "your-database-name",
    "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
]
```

**2. Migration credentials** (`apps/server/.dev.vars` and `apps/server/.env.production`):
```
CLOUDFLARE_D1_DATABASE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Drizzle Kit uses the env vars to connect to D1 via HTTP API for migrations:

```typescript
// apps/server/drizzle.config.ts — production migrations
export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId,    // from CLOUDFLARE_ACCOUNT_ID
    databaseId,   // from CLOUDFLARE_D1_DATABASE_ID
    token,        // from CLOUDFLARE_API_TOKEN
  },
});
```

## Section 2: Schema Files

The database schema is split across three files:

| File | Tables | Used By |
|------|--------|---------|
| `apps/server/src/db/schema/auth.ts` | `user`, `session`, `account`, `verification` | Auth (all sign-in methods) |
| `apps/server/src/db/schema/payments.ts` | `subscription`, `payment` | Stripe, Creem, RevenueCat |
| `apps/server/src/db/schema/credits.ts` | `creditBalance`, `creditGrant`, `creditOrder` | Credit system |

Mobile specifically uses:
- `user` + `session` + `account` -- for all auth flows
- `subscription` + `payment` -- for RevenueCat webhook events
- `creditBalance` + `creditGrant` + `creditOrder` -- for in-app credit purchases

## Section 3: Local Migrations

Local dev uses Wrangler's local D1 (SQLite file in `.wrangler/state/`):

```bash
# Initialize local D1 (creates the SQLite file)
pnpm -F server dev:init-d1
# This runs: wrangler d1 execute DB --local --persist-to .wrangler/state --command 'select 1'

# Run migrations against local D1
pnpm db:migrate:local
# This runs: drizzle-kit migrate --config drizzle.local.config.ts
```

The local config finds the SQLite file automatically:

```typescript
// apps/server/drizzle.local.config.ts
function findLocalD1DatabaseFile() {
  const baseDir = resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  // Finds the .sqlite file in the local D1 directory
  const entries = readdirSync(baseDir).filter((entry) => entry.endsWith(".sqlite"));
  const preferred = entries.find((entry) => entry !== "local.sqlite");
  return preferred ? join(baseDir, preferred) : null;
}
```

**Browse local data:**
```bash
pnpm db:studio:local
# Opens Drizzle Studio GUI against local D1
```

## Section 4: Schema Changes

When modifying schema files:

```bash
# 1. Edit schema in apps/server/src/db/schema/

# 2. Generate migration SQL
pnpm db:generate
# Creates a new migration file in apps/server/src/db/migrations/

# 3. Apply locally
pnpm db:migrate:local

# 4. Test with native app
pnpm dev:native+server

# 5. Apply to production (when ready)
pnpm db:migrate
```

Do NOT run `pnpm db:generate` for first-time setup -- migrations already exist in the repo. Only generate new migrations when you change schema files.

## Section 5: Production Migrations

Production migrations connect to D1 via HTTP API. Required env vars in `apps/server/.env.production`:

```
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_D1_DATABASE_ID=your-database-id
```

```bash
# Run production migrations
pnpm db:migrate
# This runs: drizzle-kit migrate (uses drizzle.config.ts which loads .env.production)
```

The Cloudflare API token needs these permissions:
- Account > Cloudflare D1 > Edit
- Account > Workers R2 Storage > Edit (if using R2)

## Verification

1. `pnpm db:migrate:local` -- should complete without errors
2. `pnpm db:studio:local` -- open Studio, verify tables exist (user, session, account, etc.)
3. `pnpm dev:native+server` -- sign in with the native app, check that a user row appears in Studio
4. For production: `pnpm db:migrate` then test with a production build

## Common Mistakes

- **Running `pnpm db:generate` on first setup** -- The template already has migration files in `apps/server/src/db/migrations/`. Running generate without schema changes creates an empty migration. Just run `pnpm db:migrate:local` to apply existing migrations.
- **Missing `CLOUDFLARE_API_TOKEN` for production migrations** -- `drizzle.config.ts` throws `"Missing required environment variables"` if any of the three Cloudflare credentials are missing from `.env.production`. The token needs D1 Edit permission.
- **Local D1 not initialized** -- `pnpm db:migrate:local` fails with "Local D1 database not found" if you haven't started the server at least once or run `pnpm -F server dev:init-d1`. The local SQLite file is created by Wrangler on first run.
- **Different `database_id` in wrangler vs `.env.production`** -- The wrangler binding is used at runtime; the env var is used by Drizzle for migrations. If they point to different databases, your production server reads from one database while migrations run against another.
- **Running production migrations accidentally** -- `pnpm db:migrate` targets the production D1. Use `pnpm db:migrate:local` for local development. There is no confirmation prompt.
