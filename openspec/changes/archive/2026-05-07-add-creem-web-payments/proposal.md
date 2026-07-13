# Change: Add Creem as a web payments provider

## Why
The web billing flow currently only supports Stripe. We need to add Creem as a second web payment provider without disrupting the existing Stripe and native RevenueCat flows.

## What Changes
- Add `creem` as a supported web/server payment provider while keeping Stripe as the default web provider.
- Keep the existing payment catalog and checkout service contracts stable:
  - retain `providerPriceId`
  - retain checkout `lineItems[].priceId`
  - rename only the provider upgrade method from `updateSubscriptionPrice` to `updateSubscriptionPlan`
- Add Creem checkout, portal, upgrade, and webhook support to the server payment layer.
- Extend the internal subscription status model with `paused` and map Creem `scheduled_cancel` to `active + cancelAtPeriodEnd`.
- Allow web billing UI to manage and upgrade Creem subscriptions the same way it already does for Stripe when the active provider matches the target price provider.

## Impact
- Affected specs: `payments`
- Affected code:
  - `packages/app-config/src/**`
  - `apps/server/src/payments/**`
  - `apps/server/src/db/**`
  - `apps/server/src/index.ts`
  - `apps/web/src/routes/_authed/(dashboard)/settings/billing.tsx`
  - `apps/web/src/components/landing-page/tailark/pricing/pricing-section.tsx`
