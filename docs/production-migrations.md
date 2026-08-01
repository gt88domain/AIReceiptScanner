# Production migration runbook

This runbook applies to structural D1 migrations. Data migrations, seeds,
backfills, and repairs follow their separate directories and must not be folded
into generated Drizzle SQL.

## Before merge

1. Identify the owning module, source of truth, affected tables, validation
   query, and rollback boundary or forward-fix owner.
2. Make the smallest compatible schema change. Prefer expand → backfill →
   switch reads/writes → contract in a later release when existing data or
   running application versions are involved.
3. Generate and review the structural migration and its Drizzle metadata:
   `pnpm db:generate` then `pnpm db:check`.
4. Apply it to local D1 with `pnpm db:migrate:local`; run the focused migration
   and domain tests, then `pnpm test` and `pnpm build`.
5. For every non-structural operation, add an idempotent script in the correct
   lifecycle directory with before/after counts and a safe rerun plan.

## Production execution

1. Confirm the approved deploy environment holds the exact untracked production
   configuration. Run `pnpm verify:production-config`.
2. Announce the change window and capture the pre-migration validation query or
   metrics. Do not run an unreviewed SQL console command as a substitute for a
   committed migration.
3. Apply structural migrations with `pnpm db:migrate:production`.
4. Verify the target's applied history with `pnpm exec wrangler d1 migrations list DB --remote`,
   then run the planned data validation query and a smoke test of the affected
   API path.
5. Record the migration version, operator, validation result, and any
   follow-up backfill/repair in the release record.

## Recovery

Applied structural migrations are immutable history and are not rolled back by
deleting files. Use a forward-fix migration, a traffic rollback only when data
writes remain compatible, or the pre-approved repair plan. Stop if validation
shows data loss, an unexpected row count, or incompatible application versions;
do not continue with a speculative corrective query.
