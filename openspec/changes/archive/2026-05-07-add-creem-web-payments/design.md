## Context
The server payment service already orchestrates two providers:
- Stripe for web billing
- RevenueCat for native billing

Creem needs to join the same orchestration layer without a large naming refactor. The current payment catalog uses `providerPriceId`, the checkout contract uses `lineItems[].priceId`, and database tables store internal `priceId` plus provider-specific identifiers such as `providerSubscriptionId`. Those names are already wired through Stripe and RevenueCat paths and should remain stable in this change.

## Goals
- Add Creem to the existing web billing architecture with minimal API churn.
- Reuse current checkout, portal, billing status, and webhook persistence flows.
- Support same-provider upgrade for Stripe and Creem.
- Keep native RevenueCat behavior unchanged.

## Non-Goals
- Do not rename `providerPriceId`.
- Do not change checkout inputs away from `lineItems`.
- Do not redesign the billing database schema beyond the new `paused` status support.
- Do not add dispute-specific entitlement logic in this change.

## Decisions
### Provider-specific identifiers
- `providerPriceId` remains the catalog field for all providers.
- Creem stores its `product_id` in `providerPriceId`.
- Checkout keeps `lineItems[].priceId`; Creem reads the first item and maps it to `product_id`.

### Subscription upgrades
- Rename provider method `updateSubscriptionPrice` to `updateSubscriptionPlan`.
- Keep the argument `targetPriceId`; Stripe treats it as a Stripe price ID, Creem treats it as a Creem product ID.
- Same-provider upgrade remains a provider capability. Cross-provider upgrades still fall back to a new checkout flow.

### Billing state mapping
- Add `paused` to the shared subscription status enum.
- Creem `scheduled_cancel` maps to:
  - `status = "active"`
  - `cancelAtPeriodEnd = true`
- `paused` does not grant active entitlement.
- `canManageBilling` becomes true for Stripe and Creem subscriptions because both expose a portal.

### Webhook persistence
- Keep `billingEvent` idempotency by `(provider, providerEventId)`.
- Upsert `billingCustomer` whenever Creem events include customer identity.
- One-time Creem purchases reuse `billingPurchase.providerPaymentIntentId` to store the provider transaction identifier.
- Refunds update matching one-time purchases to `refunded`.
- Disputes are stored as events only and do not change entitlements in this change.
