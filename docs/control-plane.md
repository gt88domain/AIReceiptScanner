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

## Control 2 transports

### Same Cloudflare account

`ControlReadEntrypoint` is a named `WorkerEntrypoint` exposing exactly the seven
`ControlReadV1` methods. It has no public URL and is intended only for an
explicit same-account Service Binding:

```jsonc
{
  "services": [
    {
      "binding": "AIBRANDING_CONTROL",
      "service": "downstream-project-worker",
      "entrypoint": "ControlReadEntrypoint",
    },
  ],
}
```

The binding is the capability boundary. There is no RPC shared secret, API key,
HMAC, or second token.

### Different Cloudflare accounts

Cross-account access is disabled unless `CONTROL_READ_HTTP_HOST` is a concrete,
dedicated hostname. When enabled, only that exact hostname receives the fixed,
GET-only routes under `/__control/v1/`:

```text
snapshot | overview | analytics | users | integrations | audit | system
```

The adapter sends JSON with `Cache-Control: no-store`, has no CORS headers, and
returns only bounded `400 INVALID_INPUT`, `403 FORBIDDEN`, `404 NOT_FOUND`,
`405 METHOD_NOT_ALLOWED`, or `503 CONTROL_UNAVAILABLE` responses. Other paths
on the dedicated hostname always return 404; they never fall through to the
normal public app.

Cloudflare Access must protect that hostname with a **Service Auth only**
policy. The Central Admin Worker sends `CF-Access-Client-Id` and
`CF-Access-Client-Secret` to Access. The downstream Worker never stores or
checks that secret: it validates the resulting `Cf-Access-Jwt-Assertion` against
the configured Access Team Domain JWKS, exact issuer, and exact audience.

```text
CONTROL_READ_HTTP_HOST=control.project.example
CONTROL_ACCESS_TEAM_DOMAIN=https://team.cloudflareaccess.com
CONTROL_ACCESS_AUD=access-application-audience
```

All values above are non-secret server configuration and must remain server-only.
The host is optional; when it is absent/empty the two Access values are not
required. Production preflight rejects an enabled host with missing or malformed
Access configuration, wildcard hosts, localhost, or IP literals.

Existing `adminProcedure`, route guards, Better Auth, and `ADMIN_EMAILS` remain
the local Admin authorization boundary. Future human administration uses
Cloudflare Access + MFA at `admin.aibranding.com`; EasyStarter does not add
Central RBAC or a second IAM system.

`ControlReadV1` never writes: neither transport offers generic SQL, actions,
proxying, commands, write methods, rate-limit storage, or a token manager.
Service Token credentials stay in the future Central Admin Worker, not in a
downstream Worker, D1, browser bundle, or repository.

Cloudflare remains responsible for logs, CPU, traces, and infrastructure
observability; ControlRead is not an observability platform.
