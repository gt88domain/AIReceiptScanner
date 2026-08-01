# Administrative audit log

`recordAdminAuditLog` is the append-only record for successful administrator
mutations. Domain services call it after the business write succeeds:

```ts
await recordAdminAuditLog(db, {
  actor: admin,
  action: "catalog.domain.updated",
  entity: { type: "domain", id: domain.id },
  before: { status: domain.status },
  after: { status: input.status },
});
```

Use stable, namespaced action names. Store a bounded, JSON-safe change summary;
the service redacts credential-like keys, but callers must never pass raw provider
payloads, session data, or large document bodies.
