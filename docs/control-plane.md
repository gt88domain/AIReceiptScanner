# Control Plane

## Purpose

EasyStarter defines `ControlReadV1`: an optional, versioned, read-only contract
for a company's future central administration product. It lets the existing
single-project Admin and a future central control transport share one
authoritative application read model.

The central UI at `admin.aibranding.com` is an internal product. It is not part
of EasyStarter Core.

## Levels

### Level 1 — Observe

`getSnapshot()` is a small aggregate-only project summary for an All Projects
view. It contains project/build identifiers, module flags, bounded operational
counts, status, and a generation timestamp. It deliberately contains no user
records, email, phone number, audit actor/metadata, payment detail, secret,
token, provider payload, raw error, stack trace, or storage object.

Unavailable build metadata is represented by `null`; the current template has
no authoritative deployed commit or profile value to report.

### Level 2 — Admin Read

`getOverview()`, `getAnalytics(input)`, `listUsers(input)`,
`getIntegrations()`, `listAudit(input)`, and `getSystem()` define the fixed
per-project read surface. Level 2 exposes no more PII than the existing guarded
Admin screens. User and audit pagination, search, sort, and analytics windows
reuse the existing bounded Admin input semantics.

`ControlReadV1` has no write method and no generic SQL, action, command, or
proxy escape hatch.

## Read-model ownership

The server-only Control Read facade delegates to the same functions used by the
existing `/admin`, `/admin/analytics`, `/admin/users`, `/admin/integrations`,
`/admin/audit`, and `/admin/system` oRPC handlers. The facade is not registered
as a route or an RPC namespace in this release.

Module-dependent counts query only when the resolved platform composition
enables their module. Disabled Billing, Credits, Jobs, and Storage do not cause
provider clients, Queue bindings, or R2 bindings to be initialized by this
read model. No cache, KV, Cron, Queue, or snapshot table is added.

## Transport and security boundary

Control 1 adds neither a Worker Entrypoint, Service Binding/RPC transport, HTTP
Control API, Cloudflare Access policy, CORS rule, service token, nor deployment.
Existing `adminProcedure`, route guards, Better Auth, and `ADMIN_EMAILS` remain
the local Admin authorization boundary.

Control 2 may add same-account Service Binding/RPC and cross-account
Access-protected HTTPS adapters. Any adapter must validate the schemas exported
by `@repo/shared` and map failures to the small Control error vocabulary without
returning internals.

Cloudflare remains responsible for logs, CPU, traces, and infrastructure
observability; ControlRead is not an observability platform.
