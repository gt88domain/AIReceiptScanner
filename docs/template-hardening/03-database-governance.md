# 03 — Database governance

## Source of truth

`apps/server/src/db/schema` is the only formal schema source. Drizzle-generated
structural migrations in `apps/server/src/db/migrations` are the only database
history applied by the normal migration commands. The API Worker is the only
business writer.

Current core tables include Better Auth identities/sessions, billing and
webhook inbox/outbox records, credit ledgers, and the reusable `job`,
`job_outbox`, `job_event`, `failed_job_event`, `asset`, and
`admin_audit_log` tables.

## Lifecycle separation

| Location | Use | Must not contain |
| --- | --- | --- |
| `schema/` | Drizzle table and index definitions | import logic or production repair loops |
| `migrations/` | structural `CREATE`, `ALTER`, indexes and constraints | exported data, seed rows, backfills |
| `data-migrations/` | controlled, resumable real-data moves | schema changes |
| `seeds/` | local/demo/test setup | production migration logic |
| `backfills/` | historical population after an expand step | new-table structure |
| `repairs/` | named correction of known bad production data | generic initialization |

`apps/server/src/db/README.md` already defines these boundaries. Every future
PR must follow them instead of adding one-off SQL to a route, a deploy script,
or a product module.

## Required schema-change protocol

1. Name an owning server domain and record the source of truth.
2. Write constraints, indexes, volume expectation, retention, and access
   policy before changing a schema file.
3. Generate and review a structural migration; never edit migration history or
   reuse an existing sequence number.
4. For live data use expand → backfill → switch reads/writes → contract across
   independently deployable releases.
5. Make data work idempotent, resumable, measurable, and independently
   executable from structural migration.
6. Prove all migrations apply to a clean isolated D1 database with
   `pnpm test:integration` and run `pnpm db:check` in CI.
7. State rollback or forward-repair rules before production execution.

## Audit findings

- Structural migration coverage is good: integration tests apply the migration
  set to isolated D1 before server tests.
- Lifecycle folders are policy/documentation only; no product data-migration
  runner, checkpoint table, or reconciliation report exists yet. That is
  intentional at template stage, but a real large import must add a
  domain-owned, separately reviewed runner rather than extending Drizzle SQL.
- Production migrations require credentials supplied outside Git. This is
  correct, but the release process needs an explicit owner and recorded target
  D1 identifier.

No data migration is authorized by this audit.
