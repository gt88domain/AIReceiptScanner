---
name: easystarter-web-cloudflare-d1
description: "Configure Cloudflare credentials and D1 database for EasyStarter. Use when the user mentions Cloudflare, D1, database setup, Wrangler login, database migrations, Drizzle, or says 'set up database', 'create D1', 'run migrations', 'cloudflare config'."
---

# EasyStarter Web Cloudflare D1

Set up Cloudflare credentials, create/bind a D1 database, and manage migrations with Drizzle.

## Decision Tree

```
User needs Cloudflare/D1 ->
  "create a new D1 database"           -> Section: Create D1 Database
  "run migrations" / "table not found" -> Section: Running Migrations
  "Drizzle studio" / "browse data"     -> Section: Drizzle Studio
  "wrangler login" / "API token"       -> Section: Cloudflare Credentials
  "schema change" / "add a table"      -> Section: Schema Changes
  "service binding" / "web can't reach server" -> Section: Service Binding
```

## Cloudflare Credentials

Three values are needed across multiple files:

| Variable | Where to Find | Used By |
|----------|---------------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard sidebar or URL | Drizzle config for remote migrations |
| `CLOUDFLARE_API_TOKEN` | https://dash.cloudflare.com/profile/api-tokens | Drizzle config for remote migrations |
| `CLOUDFLARE_D1_DATABASE_ID` | Output of `wrangler d1 create` or D1 dashboard | Drizzle config + `wrangler.jsonc` |

These go in two places:

**`apps/server/.dev.vars`** (local dev + local migrations):

```
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_D1_DATABASE_ID=your_database_id
```

**`apps/server/.env.production`** (production migrations via `drizzle-kit migrate`):

```
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_D1_DATABASE_ID=your_database_id
```

These are NOT runtime secrets -- they are only used by Drizzle Kit during migration commands.

## Create D1 Database

```bash
# Login first (one-time)
pnpm wrangler login

# Create the database
pnpm wrangler d1 create easysaas-db
```

Output:

```
Created D1 database 'easysaas-db'
database_id = "5d06ae22-22dc-42a4-b6fc-4a53720c9f69"
```

Update `apps/server/wrangler.jsonc`:

```jsonc
"d1_databases": [{
  "binding": "DB",                          // code references env.DB
  "database_name": "easysaas-db",           // human-readable name
  "database_id": "5d06ae22-22dc-..."        // paste from create output
}]
```

The binding name `"DB"` is what the server code uses:

```typescript
// apps/server/src/db/index.ts
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

// apps/server/src/index.ts -- Hono route
const auth = createAuth(c.env.DB, { ... });
```

## Drizzle Configuration

**Production** (`apps/server/drizzle.config.ts`) -- uses HTTP driver for remote D1:

```typescript
config({ path: ".env.production" });

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: { accountId, databaseId, token },
});
```

**Local** (`apps/server/drizzle.local.config.ts`) -- auto-discovers local SQLite:

```typescript
function findLocalD1DatabaseFile() {
  const baseDir = resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  const entries = readdirSync(baseDir).filter((entry) => entry.endsWith(".sqlite"));
  const preferred = entries.find((entry) => entry !== "local.sqlite");
  return preferred ? join(baseDir, preferred) : entries[0] ? join(baseDir, entries[0]) : null;
}

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: { url: localDbPath },
});
```

## Schema Files

Schemas live in `apps/server/src/db/schema/`:

```
apps/server/src/db/schema/
  index.ts       -> re-exports all schemas
  auth.ts        -> Better Auth tables (user, session, account, verification)
  credits.ts     -> Credit balance, grants, orders
  payments.ts    -> Subscription and payment records
```

## Running Migrations

### Local migrations (against local SQLite)

```bash
pnpm db:migrate:local
```

This first initializes D1 locally (`wrangler d1 execute DB --local`), then runs `drizzle-kit migrate --config drizzle.local.config.ts`.

### Production migrations (against remote D1)

**Prerequisite**: `apps/server/.env.production` must have `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_D1_DATABASE_ID`.

```bash
pnpm db:migrate
```

This runs `drizzle-kit migrate` using the production config with `d1-http` driver.

### Generate new migrations (after schema changes)

```bash
pnpm db:generate
```

Creates SQL migration files in `apps/server/src/db/migrations/`. Then apply:

```bash
pnpm db:migrate:local    # local
pnpm db:migrate          # production
```

## Drizzle Studio

Browse database contents visually:

```bash
pnpm db:studio:local     # local D1 (default)
pnpm db:studio           # production D1 (needs .env.production)
```

## Service Binding (Web -> Server)

The web worker calls the server worker via Cloudflare service binding, avoiding public network hops:

```jsonc
// apps/web/wrangler.jsonc
"services": [{
  "binding": "API_SERVICE",
  "service": "easystarter-server"    // MUST match apps/server/wrangler.jsonc "name"
}]
```

The web oRPC client uses this binding for server-side rendering:

```typescript
// apps/web/src/utils/orpc.ts
function getServiceBinding() {
  if (typeof window !== "undefined") return undefined;
  return typeof API_SERVICE === "undefined" ? undefined : API_SERVICE;
}

export const client = createApiClient<AppRouterClient>({
  baseUrl: import.meta.env.VITE_SERVER_URL,
  credentials: "include",
  serviceBinding: getServiceBinding(),   // direct worker-to-worker in production
});
```

## Common Mistakes

| Mistake | Why It Happens | Fix |
|---------|---------------|-----|
| `Missing required environment variables: CLOUDFLARE_ACCOUNT_ID...` | `.env.production` not created or values empty | `cp .dev.vars .env.production` and fill CF credentials |
| `Local D1 database not found` | Never ran wrangler dev or cleaned `.wrangler/` | `pnpm db:migrate:local` (auto-initializes) |
| `database_id` mismatch | wrangler.jsonc has a different ID than `.env.production` | Ensure `d1_databases[0].database_id` matches `CLOUDFLARE_D1_DATABASE_ID` |
| Migrations run but tables missing at runtime | Ran against wrong database (local vs production) | Verify which config is used: `pnpm db:migrate:local` = local, `pnpm db:migrate` = production |
| Web returns 523 "Origin is unreachable" | Service binding `service` name wrong | `"service"` in web wrangler must exactly match `"name"` in server wrangler |
| `binding "DB" not found` after wrangler.jsonc edit | Forgot to regenerate types | `pnpm -F server cf-typegen` |

## Verification Checklist

- [ ] `pnpm wrangler d1 list` shows your database
- [ ] `pnpm db:migrate:local` completes without errors
- [ ] `pnpm db:studio:local` opens and shows auth tables
- [ ] `pnpm db:migrate` applies migrations to production D1
- [ ] `apps/server/wrangler.jsonc` `database_id` matches actual D1 UUID
- [ ] `apps/web/wrangler.jsonc` `service` matches server worker name
