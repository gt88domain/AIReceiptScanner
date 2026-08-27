# Platform modules

EasyStarter keeps modules as source-controlled capabilities, not runtime plugins. A module can
hide its UI, reject its API, and skip its background work, but disabling it never deletes tables
or rolls back production data.

Auth is core and always enabled. Billing, Credits, Storage, Jobs, and
native/mobile capabilities are optional only through their existing
`packages/app-config` fields; do not introduce a parallel `modules` object or
remote feature-flag system for them.

## Capability contract

The single feature contract is derived by
`packages/app-config/src/features.ts` from the existing platform configuration. Do not create a
second `features.*` value for Billing, Credits, or Storage: their existing `enabled` fields remain
the source of truth.

| Capability | Source of truth | Dependency |
| --- | --- | --- |
| Admin | `productConfig.common.features.admin` | Auth is core and always enabled |
| Mobile runtime | `productConfig.common.features.mobile` | Enables the Server's Expo auth, mobile deep links, and native payment checks |
| Web Billing | `appConfig.web.payments.enabled` | `productConfig.common.features.jobs` |
| Native Billing | Mobile runtime + `appConfig.native.payments.enabled` | `productConfig.common.features.jobs` |
| Credits | `appConfig.web.credits.enabled` / `appConfig.native.credits.enabled` | None for grants and usage |
| Credit purchases | platform `credits.purchasesEnabled` | Billing on the same platform |
| Storage | `productConfig.common.storage.enabled` | Public-content policy may be anonymous; private attachments require product auth rules |
| Jobs | `productConfig.common.features.jobs` | Required while Billing is enabled for webhook recovery and outbox delivery |

`credits.purchasesEnabled: false` is valid when a product grants or consumes credits without
selling them. Keep it explicit when configured packages remain in the file for later use.

## Entry-point behavior

| Entry point | Disabled behavior |
| --- | --- |
| oRPC procedure | Stable `FEATURE_DISABLED` code with a not-found response |
| Public HTTP storage endpoint | 404 before a storage adapter is created |
| Payment webhook | 404 because a disabled provider's route is not registered |
| Scheduled handler | No-op before D1 is opened; Billing and Credits work are independently skipped |

Provider dashboards should also disable or remove webhook endpoints for a disabled module. A
stale endpoint receives an unregistered-route response and must not be treated as an active
integration.

## Feature verification rule

Every optional module must prove all three boundaries in its focused tests and review:

| Boundary | Required proof |
| --- | --- |
| UI | Navigation/actions use the shared resolved feature contract and do not advertise a disabled capability. |
| Server | oRPC, public HTTP, webhook, and scheduled entry points reject or no-op before provider work or a business write. |
| Data | Disabling a module neither deletes tables nor skips its ordered migrations; schema removal is a separate, explicit data-retirement decision. |

Feature values are source-controlled product configuration, not a remote experimentation
system. Do not introduce per-request feature flags, client-only authorization, or a second
configuration source without an explicit product decision.

## Schema and migrations

Migrations remain one ordered, immutable application history under
`apps/server/src/db/migrations`. They are not dynamically registered or rolled back.

| Module | Schema ownership | Migration capability |
| --- | --- | --- |
| Core/Auth | `apps/server/src/db/schema/auth.ts` | Auth tables and session indexes |
| Billing | `apps/server/src/db/schema/payments.ts` | Customers, checkout, purchase, subscription, webhook, and outbox state |
| Credits | `apps/server/src/db/schema/credits.ts` | Ledger, grants, billable operations, disputes, and invariants |
| Storage | `apps/server/src/db/schema/assets.ts` | Product-file ownership and visibility metadata |
| Jobs | `apps/server/src/db/schema/jobs.ts` | Retry, lease, delivery, and dead-letter state |

Avoid documenting a hand-maintained list of migration numbers. It becomes stale after every
schema evolution. The current migration directory and schema ownership are the source of truth.

## Pre-deploy check

For first setup or secret rotation, validate the plaintext rotation file against
the enabled modules; it never prints secret values. Daily deploys instead use
the production preflight, which checks required secret names on the live Worker.

```bash
pnpm --filter server module:check -- /absolute/path/to/.env.production
pnpm verify:production-config
```

Production D1 migration is a separate, explicitly approved operation. Applied
migration state belongs to the target database, so inspect it with `wrangler d1
migrations list` and use the production migration command only after the owner
approves the reviewed migration. A local script must not claim that it inspected
a remote database when it has not.

## Adding a module

1. Keep its schema in its domain file and generate one normal migration.
2. Add only a small feature condition to shared config if the capability is optional.
3. Gate every oRPC, HTTP, webhook, and scheduled entry point before creating providers.
4. Add its UI entry conditionally, but leave TanStack file-based route files and URLs in place.
5. Extend this document with its ownership and dependencies.
