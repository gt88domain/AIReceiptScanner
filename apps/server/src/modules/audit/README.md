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

## Coverage rule

Every successful `adminProcedure` that changes durable state writes one audit
record after the domain operation succeeds. The template's administration routes
cover failed Job retry/ignore and billing webhook/outbox replay. New product
admin actions such as credit adjustment, domain configuration, content publish,
or user suspension must add an action name, bounded before/after summary, and a
focused test proving the successful mutation creates the expected audit row.

Do not use this table as a catch-all event stream: user self-service actions,
provider webhooks, and credit grants/consumption belong to their own domain
records. A failed or no-op admin request does not create a success audit row.
