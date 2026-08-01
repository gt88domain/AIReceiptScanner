# 04 — Security check

Complete this before importing sensitive data, exposing a migrated route, or
cutting traffic to the new system.

## Required review

- Authentication: identify the session boundary; imports never manufacture a
  logged-in session.
- Admin: only `ADMIN_EMAILS` controls administration. A paid plan, imported
  role, or legacy header must not grant admin access.
- Entitlements and credits: resolve from verified payment-provider webhooks and
  the existing credits service; do not import a UI plan badge as authority.
- Capabilities: gate product features with server-side capability checks, not
  `if (plan === "pro")` in application code.
- Webhooks: verify signatures, preserve provider event IDs, and prove duplicate
  delivery is idempotent.
- Assets: create an asset record, preserve owner and visibility, and never use
  a raw storage key as a public authorization decision.
- Secrets and personal data: do not commit exports, credentials, cookies, or
  provider payloads. Redact logs and audit snapshots.
- Audit: every successful administrator mutation records actor, action, entity,
  before/after summary, and timestamp using `recordAdminAuditLog`.

Write the denial cases alongside the happy path: ordinary user denied, paid
user not promoted to admin, duplicate webhook harmless, and unauthorized asset
read denied.
