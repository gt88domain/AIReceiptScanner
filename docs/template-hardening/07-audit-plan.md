# 07 — Audit-log plan

## Existing baseline

`admin_audit_log` is append-only and records actor ID/email, action, entity
type/ID, before/after summaries, and timestamp. `recordAdminAuditLog` redacts
credential-like keys recursively. The admin router already audits failed-job
retry and ignore decisions.

This is an administrative mutation log, not a replacement for analytics,
request logs, payment webhook history, or an event-sourcing system.

## Required use

After a successful admin-owned domain mutation, record one bounded action:

```ts
await recordAdminAuditLog(db, {
  actor: admin,
  action: "catalog.item.published",
  entity: { type: "catalog_item", id: item.id },
  before: { status: "draft" },
  after: { status: "published" },
});
```

Action names are stable and namespaced. Snapshots are change summaries, not
raw entity dumps; they must exclude passwords, tokens, cookies, provider
payloads, generated documents, and unbounded user content.

## Gaps to close in `hardening/audit`

- Define action-name and entity-type conventions plus required mutation points
  for admin procedures, refund decisions, and manual recovery operations.
- Add tests proving privileged mutation + audit success together, including
  redaction and a failure path that does not log a mutation that never
  committed.
- Decide operational retention, export/access controls, correlation/request
  IDs, and any privacy deletion policy with the product owner. Those are not
  safe template defaults.
- Consider a narrow helper pattern that makes it difficult to forget auditing,
  without hiding the domain write or creating an implicit global interceptor.

No customer activity stream or product-specific audit event is added in Phase 0.
