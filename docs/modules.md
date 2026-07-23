# Platform modules

EasyStarter keeps modules as source-controlled capabilities, not runtime plugins. A module can
hide its UI, reject its API, and skip its background work, but disabling it never deletes tables
or rolls back production data.

## Capability contract

The single feature contract is derived by
`packages/app-config/src/features.ts` from the existing platform configuration. Do not create a
second `features.*` value for Billing, Credits, or Storage: their existing `enabled` fields remain
the source of truth.

| Capability | Source of truth | Dependency |
| --- | --- | --- |
| Admin | `common.features.admin` | Auth is core and always enabled |
| Web Billing | `web.payments.enabled` | `common.features.jobs` |
| Native Billing | `native.payments.enabled` | `common.features.jobs` |
| Credits | `web.credits.enabled` / `native.credits.enabled` | None for grants and usage |
| Credit purchases | platform `credits.purchasesEnabled` | Billing on the same platform |
| Storage | `common.storage.enabled` | Public-content policy may be anonymous; private attachments require product auth rules |
| Jobs | `common.features.jobs` | Required while Billing is enabled for webhook recovery and outbox delivery |

`credits.purchasesEnabled: false` is valid when a product grants or consumes credits without
selling them. Keep it explicit when configured packages remain in the file for later use.

## Entry-point behavior

| Entry point | Disabled behavior |
| --- | --- |
| oRPC procedure | Stable `FEATURE_DISABLED` code with a not-found response |
| Public HTTP storage endpoint | 404 before a storage adapter is created |
| Payment webhook | 204 no-op before request body, context, or provider initialization |
| Scheduled handler | No-op before D1 is opened; Billing and Credits work are independently skipped |

Provider dashboards should also disable or remove webhook endpoints for a disabled module. The
204 fallback deliberately prevents a stale provider configuration from retrying indefinitely.

## Schema and migrations

Migrations remain one ordered, immutable application history under
`apps/server/src/db/migrations`. They are not dynamically registered or rolled back.

| Module | Schema ownership | Migration capability |
| --- | --- | --- |
| Core/Auth | `apps/server/src/db/schema/auth.ts` | Auth tables and session indexes |
| Billing | `apps/server/src/db/schema/payments.ts` | Customers, checkout, purchase, subscription, webhook, and outbox state |
| Credits | `apps/server/src/db/schema/credits.ts` | Ledger, grants, billable operations, disputes, and invariants |
| Storage | No table in the starter | Object-provider binding only; add a table only for product metadata/ACL needs |
| Jobs | Billing and Credits schemas above | Retry, outbox, and maintenance state live with the owning domain |

Avoid documenting a hand-maintained list of migration numbers. It becomes stale after every
schema evolution. The current migration directory and schema ownership are the source of truth.

## Pre-deploy check

Run the check with the runtime-secret file that will be deployed. It validates only secrets for
enabled modules; it never prints them.

```bash
pnpm --filter server module:check -- /absolute/path/to/.dev.vars.production
pnpm db:migrate:production
```

Wrangler validates Worker bindings during deployment. Applied D1 migration state belongs to the
target database, so verify it with the production migration command or `wrangler d1 migrations
list`; a local script must not claim that it inspected a remote database when it has not.

## Adding a module

1. Keep its schema in its domain file and generate one normal migration.
2. Add only a small feature condition to shared config if the capability is optional.
3. Gate every oRPC, HTTP, webhook, and scheduled entry point before creating providers.
4. Add its UI entry conditionally, but leave TanStack file-based route files and URLs in place.
5. Extend this document with its ownership and dependencies.
