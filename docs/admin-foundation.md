# Admin Foundation

EasyStarter keeps administration in the existing authenticated Web application
and API Worker. It does not run a second Admin backend, authentication system,
or permission model.

## Routes

| Route | Purpose |
| --- | --- |
| `/admin` | Platform overview and concise operational summary. |
| `/admin/users` | Read-only user directory with the existing search, sorting, and pagination. |
| `/admin/integrations` | Safe configuration state for supported platform services and providers. |
| `/admin/audit` | Existing durable admin mutation log. |
| `/admin/system` | Runtime composition, resource state, and small operational counts. |

Every route uses the same server-side `getAdminAccess()` guard. The browser
never evaluates `ADMIN_EMAILS`, reads Worker bindings, or accesses D1 directly.
All Admin data is returned from `adminProcedure` endpoints.

## Boundaries

- Integrations report `configured`, `disabled`, or `missing`. They do not expose
  credentials, provider identifiers, binding identifiers, secret prefixes, or
  secret lengths, and they do not call third-party APIs.
- Audit is an administrative durable-mutation log, not a request log, activity
  tracker, analytics system, or webhook payload viewer.
- System is a configuration and count summary. Detailed infrastructure logs and
  metrics remain in Cloudflare.
- Runtime composition decides whether Billing, Credits, Storage, and Jobs are
  enabled. Admin read models must not initialize a disabled module.

## Deliberate exclusions

This foundation has no RBAC editor, menu CMS, organizations, user mutation,
impersonation, analytics, Ticket inbox, Discovery administration, or
observability platform.

Future work stays separate:

- Admin B: analytics or an actually justified shared DataTable improvement.
- Ticket: inbox, tickets, messages, and attachments.
- Discovery: its own v5 administration surface.
