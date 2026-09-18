# 05 — Cutover

Cut over only when the prior five documents are complete and the smallest
independent migration slice is ready.

## Before traffic changes

- Run the required test gates: `pnpm test:template` and `pnpm test:integration`.
- Apply the schema migration separately from data migration/backfill work.
- Run a representative dry run and reconcile record counts, IDs, asset bytes,
  and critical user-visible results.
- Verify production safety configuration, deployment target, Worker bindings,
  D1 ID, R2 bucket, secrets, and payment-provider live mode.
- Define rollback: traffic switch back, read fallback, or forward repair. State
  which data writes make rollback unsafe.

## During and after cutover

Monitor request errors, job failures, queue backlog, webhook failures, import
rejects, reconciliation counts, and audit entries. Keep the legacy system
readable until the agreed acceptance window ends. Do not delete legacy data or
code merely because the first deploy succeeded.

Close the migration only after the data owner signs off on reconciliation,
security checks, and the retirement/defer decisions from the audit.
