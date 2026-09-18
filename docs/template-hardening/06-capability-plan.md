# 06 — Capability plan

## Current contract

`packages/app-config/src/app-config.ts` owns the capability map:

```ts
featureCapabilities: {
  // "directory.export": { minimumTier: "yearly" },
}
```

The API Worker resolves a capability from webhook-backed membership state via
`context.capabilities.can(user, capability)`. Unknown capability names deny by
default. `requireCapability(context, name)` is the standard oRPC/domain guard.
This is deliberately separate from authentication, admin access, credits, and
UI plan labels.

## Required use

| Need | Correct mechanism | Incorrect shortcut |
| --- | --- | --- |
| Signed-in user | `requireUser` / `protectedProcedure` | trusting a client user object |
| Administrator | `requireAdmin` / `adminProcedure` | a plan, role field, or request header |
| Paid tier | `requireEntitlement` | comparing a display-plan string |
| Feature access | `requireCapability` | `if (plan === "pro")` |
| Metered operation | credits service plus domain policy | capability alone as a quota |

## Gaps to close in `hardening/capabilities`

1. Define a concise capability naming/ownership registry and reject duplicate
   semantics during review.
2. Add a focused integration example that proves an enabled capability allows a
   user and a missing/insufficient capability denies one. It must stay generic;
   no product feature is added.
3. Document capability changes as a billing/config rollout: add the
   configuration, deploy server guard, then expose UI. Capability removal must
   consider existing paid users and queued jobs.
4. Make code-review checks require a server guard at every paid product command
   and prohibit direct membership-tier comparisons in product modules.

The empty default map is correct for a product-neutral template. Phase 0 does
not invent default paid features.
