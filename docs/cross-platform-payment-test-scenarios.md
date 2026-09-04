# Stripe and RevenueCat Cross-Platform Scenarios

This focused matrix covers Web Stripe and native RevenueCat/IAP interactions
through the shared server entitlement model.

## Legend

| Abbr | Meaning |
|------|---------|
| W    | Web / Stripe |
| N    | Native / RevenueCat (iOS or Android) |
| M    | Monthly subscription |
| Y    | Yearly subscription |
| L    | Lifetime one-time purchase |

---

## 1. Entitlement Resolution (`resolveCurrentEntitlement`)

Core rule: highest tier wins; on tie, most-recently-updated wins.

| # | Current state | Expected tier | Expected source |
|---|---------------|---------------|-----------------|
| 1.1 | No subscriptions, no purchases | free | none |
| 1.2 | One active W-Monthly | monthly | subscription |
| 1.3 | One active N-Monthly | monthly | subscription |
| 1.4 | One active W-Yearly | yearly | subscription |
| 1.5 | One active N-Yearly | yearly | subscription |
| 1.6 | One succeeded W-Lifetime | lifetime | lifetime |
| 1.7 | One succeeded N-Lifetime | lifetime | lifetime |
| 1.8 | W-Monthly(active) + N-Yearly(active) | yearly | subscription |
| 1.9 | N-Monthly(active) + W-Yearly(active) | yearly | subscription |
| 1.10 | W-Monthly(active) + N-Lifetime(succeeded) | lifetime | lifetime |
| 1.11 | N-Yearly(active) + W-Lifetime(succeeded) | lifetime | lifetime |
| 1.12 | W-Monthly(canceled) — no active | free | none |
| 1.13 | W-Monthly(canceled) + N-Yearly(active) | yearly | subscription |
| 1.14 | W-Monthly(active, older) + W-Yearly(active, newer) — same provider tie | yearly | subscription |
| 1.15 | W-Monthly(trialing) | monthly | subscription |
| 1.16 | N-Lifetime(refunded) | free | none |
| 1.17 | W-Monthly(past_due) — not in ACTIVE set | free | none |
| 1.18 | Two active monthlies: W(older) + N(newer) — same-tier tie-break by updatedAt | monthly | subscription (N wins) |

## 2. Checkout Decision (`evaluateCheckoutDecision`)

| # | Current entitlement | Target price | Expected action | Expected reason |
|---|---------------------|-------------|-----------------|-----------------|
| 2.1 | free / none | Monthly sub | checkout | ok |
| 2.2 | free / none | Yearly sub | checkout | ok |
| 2.3 | free / none | Lifetime | checkout | ok |
| 2.4 | monthly / sub | Yearly sub | upgrade | subscription_upgrade |
| 2.5 | monthly / sub | Lifetime | checkout | ok |
| 2.6 | monthly / sub | Monthly sub | deny | downgrade_or_same_tier |
| 2.7 | yearly / sub | Monthly sub | deny | downgrade_or_same_tier |
| 2.8 | yearly / sub | Yearly sub | deny | downgrade_or_same_tier |
| 2.9 | yearly / sub | Lifetime | checkout | ok |
| 2.10 | lifetime / lifetime | Monthly sub | deny | already_lifetime |
| 2.11 | lifetime / lifetime | Yearly sub | deny | already_lifetime |
| 2.12 | lifetime / lifetime | Lifetime | deny | already_lifetime |

## 3. Cross-Provider Upgrade Scenarios (Server `createCheckoutSession`)

When the user upgrades across providers, `evaluateCheckoutDecision` returns `upgrade`,
but the providers differ, so the server allows it as a fresh checkout.
The lower-tier Stripe subscription is auto-canceled at period end via webhook.

| # | Scenario | Checkout allowed? | Side effect |
|---|----------|-------------------|-------------|
| 3.1 | Has W-Monthly, buys N-Yearly via IAP | Yes (cross-provider upgrade) | W-Monthly set cancelAtPeriodEnd after RC webhook |
| 3.2 | Has N-Monthly, buys W-Yearly via Stripe | Yes (cross-provider upgrade) | — (RC sub managed by app store) |
| 3.3 | Has W-Monthly, buys N-Lifetime via IAP | Yes (checkout, not upgrade) | W-Monthly set cancelAtPeriodEnd after RC webhook |
| 3.4 | Has N-Monthly, buys W-Lifetime via Stripe | Yes (checkout, not upgrade) | — |
| 3.5 | Has W-Yearly, tries to buy N-Monthly | No (deny: downgrade) | — |
| 3.6 | Has N-Yearly, tries to buy W-Monthly | No (deny: downgrade) | — |
| 3.7 | Has W-Lifetime, tries to buy N-Monthly | No (deny: already_lifetime) | — |

## 4. Stripe Subscription Lifecycle (`applyStripeSubscriptionCancellationForActivatedPrice`)

When a higher-tier entitlement activates (from any provider), lower-tier Stripe subs are canceled at period end.

| # | Activated price | Existing Stripe subs | Expected cancellation |
|---|-----------------|---------------------|-----------------------|
| 4.1 | Yearly (any provider) | Monthly (active) | Cancel monthly at period end |
| 4.2 | Lifetime (any provider) | Monthly (active) + Yearly (active) | Cancel both at period end |
| 4.3 | Monthly (any provider) | — | No action (monthly/free tier skipped) |
| 4.4 | Yearly (any provider) | Monthly (already cancelAtPeriodEnd) | Skip (already canceling) |
| 4.5 | Yearly (any provider) | Yearly (active) | Skip (same tier, not lower) |
| 4.6 | Lifetime (any provider) | Monthly (canceled status) | Skip (not cancellable status) |

## 5. RevenueCat Webhook Processing

| # | RC event type | Expected DB operation |
|---|---------------|----------------------|
| 5.1 | INITIAL_PURCHASE (subscription) | upsert billingSubscription (active) |
| 5.2 | INITIAL_PURCHASE (lifetime) | upsert billingPurchase (succeeded) |
| 5.3 | RENEWAL | upsert billingSubscription (active) |
| 5.4 | CANCELLATION (subscription) | upsert billingSubscription (cancelAtPeriodEnd=true) |
| 5.5 | CANCELLATION (lifetime) | upsert billingPurchase (refunded) |
| 5.6 | EXPIRATION | upsert billingSubscription (canceled, endedAt set) |
| 5.7 | UNCANCELLATION | upsert billingSubscription (cancelAtPeriodEnd=false) |
| 5.8 | PRODUCT_CHANGE | informational only; keep current entitlement unchanged and wait for follow-up RENEWAL / INITIAL_PURCHASE |
| 5.9 | TEST event | Silently ignored |
| 5.10 | Anonymous user ID ($RCAnonymousID:xxx) | Silently ignored (no userId) |
| 5.11 | Unknown product_id | Silently ignored (no price mapping) |

## 6. UI Checkout Policy (`resolveCheckoutPolicyDecision`)

Frontend-only additions on top of `evaluateCheckoutDecision`:

| # | Scenario | Expected action | Expected reason |
|---|----------|-----------------|-----------------|
| 6.1 | Target price is null | disabled | downgrade_or_same_tier |
| 6.2 | Target price is the current active price | disabled | current_price |
| 6.3 | Free user → monthly | checkout | ok |
| 6.4 | Monthly user → yearly | upgrade | subscription_upgrade |
| 6.5 | Lifetime user → anything | disabled | already_lifetime |

## 7. Native Client Entitlement Sync (`useNativePayments`)

After a purchase on the native client, the server may not have processed the webhook yet.

| # | Scenario | Expected behavior |
|---|----------|-------------------|
| 7.1 | Purchase succeeds | 30s local trust window starts, poll server every 3s |
| 7.2 | Server confirms same entitlement within window | Window closes early, switch to server state |
| 7.3 | Server does not confirm within 30s | Window expires, fall back to server state |
| 7.4 | User is not authenticated | Always use local (RevenueCat SDK) state |
| 7.5 | Purchase cancelled by user | No trust window, no error set |

## 8. Edge Cases

| # | Scenario | Expected behavior |
|---|----------|-------------------|
| 8.1 | Same user subscribes monthly on both W and N simultaneously | Highest tier wins (both monthly → tie-break by updatedAt) |
| 8.2 | User has lifetime + active subscription | Lifetime wins (rank 3 > 2) |
| 8.3 | User refunds lifetime, has active yearly | Yearly becomes active entitlement |
| 8.4 | Stripe webhook arrives before RC webhook for cross-provider upgrade | Intermediate state resolves correctly on next billing status fetch |
| 8.5 | Price ID not found in catalog | Subscription/purchase ignored in entitlement resolution |
| 8.6 | Multiple lifetime purchases (W + N) | Tie-break by updatedAt |
| 8.7 | Trial on Stripe after previous trial consumed | trialDays suppressed to null |
