# 01 — Architecture

## Approved ownership model

| Layer | Owns | Must not own |
| --- | --- | --- |
| Browser | interaction state and requests | credentials, D1, R2 authorization decisions |
| Web Worker | TanStack Start SSR, UI, routing, SEO, typed API client | business D1 bindings, SQL, migrations, business writes |
| API Worker | Hono routes, oRPC, auth, business policy, D1/R2/Queue access | product UI and a second source of business truth |
| D1 | durable business records and migration history | browser-accessible authority |
| R2 | object bytes referenced by server-owned asset records | authorization by raw key alone |
| Queue | at-least-once delivery of durable job IDs | the sole record of job state |
| Workflow | long-lived/multi-step/human-approval orchestration | a generic replacement for the short-job queue |

## Current enforcement evidence

- The Web Worker has an `API_SERVICE` binding only in `apps/web/wrangler.jsonc`.
- `apps/server/wrangler.jsonc` declares D1, R2, Queue, cron, and API Worker
  runtime configuration.
- `apps/server/src/lib/context.ts` constructs the D1, storage, payments,
  capabilities, credits, and jobs services only in the API Worker.
- `apps/web/README.md` explicitly prohibits D1 and server-secret access.
- `apps/server/src/modules/README.md` requires business domains under
  `apps/server/src/modules/<domain>`; routers mount public surfaces and do not
  become business-logic homes.

## Required module shape for future product work

Each product domain has one server owner and may expose only the layers it
needs:

```text
apps/server/src/modules/<domain>/
  domain.schema.ts       # validation / domain types when useful
  domain.repository.ts   # D1 reads and writes
  domain.service.ts      # commands and invariants
  domain.policy.ts       # authorization and entitlement decisions
  domain.router.ts       # thin oRPC surface, if required
```

This is a placement rule, not permission to pre-create empty files. A domain
uses the standard foundations through explicit imports: `requireCapability`,
`createJobService`, Asset Service, `recordAdminAuditLog`, credits, or payments.

## Architecture invariants for review

1. No `apps/web` D1, R2, Queue, or business-secret binding.
2. No SQL, Drizzle schema, or migration under `apps/web`.
3. New business mutations enter through the API Worker and a domain service.
4. Product data schema lives in `apps/server/src/db/schema`; structural SQL
   lives in `apps/server/src/db/migrations`.
5. Product files are referenced by `asset.id`, never treated as authorized by a
   raw storage key.
6. Retryable work has a durable D1 job before Queue delivery; long-lived work
   uses Cloudflare Workflows directly.
7. Client plan labels, hidden UI, and product routes are presentation only;
   the API Worker makes authorization decisions.

## Drift to remove over time

The legacy Web README still suggests `src/custom/<module>` while the root
engineering rules require `apps/web/src/modules/<domain>`. A documentation-only
cleanup belongs in a later focused PR; no new domain should use `custom/`.

The template's operational examples contain demo identifiers. They are not
architecture violations, but each adopter must replace them before deploying.
