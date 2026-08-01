# Database change lifecycle

Database work is separated by intent. A change belongs in exactly one of the
directories below; do not combine schema changes, imports, test fixtures, and
historical repairs in one script or migration.

| Location | Purpose | Execution rule |
| --- | --- | --- |
| `schema/` | Drizzle table and relation definitions | Source for structural migrations |
| `migrations/` | Generated D1/Drizzle structural changes | Only `CREATE`, `ALTER`, indexes, and other schema changes |
| `data-migrations/` | Versioned transformations from one valid data shape to another | Idempotent, scoped, and recorded with a verification query |
| `seeds/` | Rebuildable local, test, demo, or documented public data | Never depend on production-only secrets or a one-off local machine |
| `backfills/` | Populate a newly introduced field or derived value for existing rows | Safe to resume and measurable by remaining-row count |
| `repairs/` | One-off correction for a known bad data set | State the incident/scope, approval, before/after checks, and rollback/forward-fix plan |

`pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:migrate:local` operate on
structural migrations only. Do not put seed inserts, external imports, or
production backfills in generated Drizzle migrations.

Every committed data operation must identify its source, target tables, safe
rerun behavior, and verification command. Production data operations need an
explicit rollout and recovery plan; a successful TypeScript build is not data
verification.
