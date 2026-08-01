# 02 — Security review

## Confirmed controls

| Control | Evidence | Assessment |
| --- | --- | --- |
| Authentication | Better Auth session is rechecked for soft-deleted users by `requireUser` | Present |
| Administration | `requireAdmin` uses only normalized server-secret `ADMIN_EMAILS` | Present |
| Paid access | `requireEntitlement` and `requireCapability` read webhook-backed billing state | Present |
| Webhook safety | Billing events are uniquely keyed and processing is leased/retryable | Present |
| Public API boundary | Hono security headers, constrained CORS, request limits on contact/newsletter/webhooks | Present |
| Private files | Asset Service checks owner/public visibility before retrieving storage | Present |
| Production target checks | preflight checks Worker/D1/R2/queue/url identities and enabled-provider secrets | Present |
| Supply chain | locked pnpm install plus OSV scanner on PRs and weekly schedule | Present |

## Findings and required decisions

| Priority | Finding | Required follow-up |
| --- | --- | --- |
| P0 | Production safety depends on operator-supplied `.env.production` and `.production-safety.env`; CI cannot validate a real target without exposing secrets | Document the release owner and run the preflight from a secret manager/approved deploy environment. Do not add fake production values. |
| P0 | `app-config.ts` retains sample domains, email domain, app IDs, and payment price IDs | Add a focused adopter-configuration review/check so a fork cannot deploy with inherited identifiers. Keep real secrets out of Git. |
| P1 | `/api/storage/*` authorizes public avatars by a constrained key prefix, while product files use Asset Service authorization | Preserve the avatar exception as legacy UI storage; make future product file routes asset-ID based and add a guard against new raw-key public routes. |
| P1 | Capability and audit calls are explicit rather than mechanically mandatory | Define a review checklist/static boundary for privileged domain mutations; do not add hidden database roles or client-side plan checks. |
| P1 | Queue/DLQ failures are persisted but no alert/owner/escalation policy is defined | Add operational monitoring and incident procedures in the jobs PR. |
| P2 | This audit cannot inspect repository branch protection, Cloudflare IAM, provider dashboards, or deployed secrets | Record those as an operator checklist, not as source-code claims. |

## Security rules that future PRs must preserve

- Use `requireUser`, `requireAdmin`, `requireCapability`, and
  `requireEntitlement`; do not introduce bespoke header/session guards.
- `protectedProcedure` is authentication only, not administration or paid
  entitlement.
- Payment events never grant admin access. UI plan text never grants paid
  access.
- Verify every webhook before its event is persisted; preserve provider event
  IDs and test duplicate delivery.
- Pass bounded, redacted summaries to audit logging. Never put credentials,
  cookies, provider raw bodies, or large generated content into an audit row.
- Validate MIME type, size, ownership, and visibility at every product upload
  boundary before calling storage.

## Proof expected for security-sensitive changes

At minimum: ordinary user denial, allowlisted-admin access, paid-user
non-admin denial, unknown-capability denial, webhook idempotency, unauthorized
asset denial, and production-config negative cases. These are server tests;
client hiding is never proof of authorization.
