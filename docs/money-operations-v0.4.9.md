# v0.4.9 money operations upgrade

This release adds durable payment operations and aggregate credit-purchase
recovery state. It has one additive structural migration: `0020`.

## Production rollout

1. Back up D1 and confirm the database is at migration `0019`.
2. Apply `0020` before deploying the v0.4.9 Worker.
3. Run the legacy recovery audit and review every `legacy_review` order before
   allowing automated recovery changes for it.
4. Deploy the Worker, then confirm the scheduled payment-operation reconciler
   is completing `provider_succeeded` rows.
5. Confirm the operational alert channel receives partial-refund dead letters.

Do not run a down migration. v0.4.8 ignores the additive columns and tables,
but its older recovery logic does not understand aggregate counters. If a
rollback is necessary after v0.4.9 has processed recoveries, pause payment
webhooks and assess affected orders before running v0.4.8 code again.

## Manual-review conditions

- Partial refunds never revoke credits automatically.
- Providers without documented native idempotency enter `manual_review` if a
  provider request has an ambiguous result.
- Incomplete historical recovery information must be marked `legacy_review`;
  it is never automatically restored.
