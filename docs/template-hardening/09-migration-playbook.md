# 09 — Migration playbook

This template already contains the required migration packet under
`docs/migration/`. Product migrations must read and complete these documents in
order:

1. `00-audit.md`
2. `01-data-owner.md`
3. `02-domain-model.md`
4. `03-schema-plan.md`
5. `04-security-check.md`
6. `05-cutover.md`

The non-negotiable engineering sequence is:

```text
Audit → Architecture → Schema → Migration → Feature
```

## Template-level rules

- Legacy code and data are evidence, not target architecture.
- Each migration slice has a named owner, source-of-truth decision, validation
  method, and rollback or forward-fix plan before cutover.
- Do not copy old code, repair pages, or add product behavior before the
  corresponding audit/domain/schema/security decisions are reviewable.
- Structural D1 migrations, data moves, seeds, backfills, and repairs stay in
  their separate lifecycle locations described in `03-database-governance.md`.
- An importer belongs to its destination domain and cannot manufacture auth
  sessions, administrators, payment entitlements, or credit balances.
- Assets retain owner and visibility through asset records; raw keys are not an
  import authorization mechanism.

## Per-slice review packet

| Item | Required answer |
| --- | --- |
| Scope | preserve, replace, retire, or defer each legacy outcome |
| Owner | authoritative writer before/during/after cutover |
| Target | server domain, D1 schema, asset references, API surface |
| Safety | auth/admin/capability/payment/asset risks and denial cases |
| Data | volume, stable IDs, duplicate policy, batches, checkpoints |
| Validation | counts, samples, reconciliation query, user-visible proof |
| Recovery | rollback boundary or forward repair owner |

Phase 0 creates no migration script and moves no product data.
