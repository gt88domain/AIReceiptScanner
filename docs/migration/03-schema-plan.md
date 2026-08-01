# 03 — Schema plan

Write and review this plan before creating Drizzle schema files or migrations.

## Plan each change

For every target table or asset, document:

- owner domain, fields, constraints, indexes, and source-of-truth decision;
- legacy-to-new identifier mapping and duplicate handling;
- expected volume, batch size, duration, and restart behaviour;
- validation queries and reconciliation counts; and
- rollback or forward-fix strategy.

Use the database lifecycle boundaries in `apps/server/src/db/README.md`:

| Kind | Purpose |
| --- | --- |
| Schema migration | Changes database structure only. |
| Data migration | Moves or transforms real data. |
| Seed | Creates local/demo/test data. |
| Backfill | Fills a newly introduced historical field. |
| Repair | Corrects known bad production data. |

Never mix these concerns in one script or one migration. Structural changes use
Drizzle migrations. Data work must be idempotent, resumable, observable, and
owned by the domain; write it under the matching lifecycle directory.

## Compatibility

Use expand → backfill → switch reads/writes → contract for deployed systems.
Do not drop or rename a live field in the same release that first depends on
its replacement. Test every SQL migration against an empty isolated D1 database
through `pnpm test:integration`.
