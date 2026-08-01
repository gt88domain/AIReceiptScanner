# Rate-limiting policy

Rate limiting is a product security policy, not one generic counter shared by
unrelated endpoints. Every new limit must name its subject, operation, window,
response, storage/edge mechanism, and focused test before implementation.

## Enforcement layers

| Concern | Standard mechanism | Notes |
| --- | --- | --- |
| Volumetric and anonymous IP abuse | Cloudflare WAF rate-limiting rule | Configure per path/method and deploy target; this belongs to the operator, not `wrangler.jsonc`. |
| Login, reset, verification | Better Auth database rate limit | Shared across Worker isolates. Keep provider defaults unless a reviewed policy changes them. |
| Contact/newsletter convenience throttle | Existing per-isolate in-memory helper | UX protection only; it is never the sole production abuse control. |
| Paid/AI generation allowance | Credits + billable operation + Job idempotency | These authorize money-consuming work and prevent duplicate charge/work. Add a product quota only when a business limit is specified. |
| API-key or tenant quotas | Product-specific edge rule or strict subject-sharded limiter | Requires an explicit API-key/tenant product decision. |

## Operator checklist

Before a production rollout, define WAF rules for authentication endpoints,
anonymous form endpoints, and any public write API. Record path/method, counting
characteristic, threshold/window, action, exceptions, owner, alert, and review
date. Start from observed traffic; do not copy a universal request count.

## Implementation constraints

- Do not use Workers KV as a strict distributed counter: concurrent writes can
  overwrite each other, cross-location visibility is eventually consistent, and
  the same key supports only one write per second.
- Do not create one global Durable Object limiter. If a strict application
  counter is actually required, shard by `scope:subject` and document retention,
  failure behavior, and load expectations in its owning domain.
- Return a stable `429` and a bounded retry hint for application-enforced
  limits. Never make a client-side hidden button the enforcement mechanism.
- A limit cannot grant authorization. Keep authentication, capability, credit,
  and idempotency checks independent of it.

References: [Cloudflare WAF rate-limiting guidance](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/),
[Workers KV write consistency](https://developers.cloudflare.com/kv/api/write-key-value-pairs/),
and [Durable Object rules](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/).
