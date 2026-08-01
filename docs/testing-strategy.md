# Template testing strategy

The template has one required command, which runs two gates:

```bash
pnpm test

# Individual gates when diagnosing a failure
pnpm test:template
pnpm test:integration
```

`test:template` validates payment and credits configuration, production safety,
security headers, and small infrastructure rules. `test:integration` applies
every Drizzle migration to an isolated D1 database before exercising the server.
Both run in GitHub Actions.

| Area | Required proof |
| --- | --- |
| Auth | An authenticated user can use protected paths; a deleted or absent session is denied. |
| Admin | Ordinary and paid users are denied; only `ADMIN_EMAILS` allowlisted users are allowed. |
| Billing | Membership and price configuration resolve to the expected entitlement. |
| Webhooks | A verified provider event is persisted once and a duplicate delivery has no extra effect. |
| Credits | Charges are idempotent and a failed operation refunds exactly once. |
| Migrations | Every SQL migration applies to a clean isolated D1 database. |

For a change in one of these areas, update the smallest test that proves its
new behavior. UI interactions and marketing pages are optional tests; prefer
them when a regression would be costly, not merely because a component exists.
