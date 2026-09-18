# Change: Add Stripe Pro 7-day trial checkout

## Why
Pro monthly/yearly plans should support a free trial period to reduce initial payment friction. The trial must be applied only once per user to prevent repeated trial abuse.

## What Changes
- Add `trialDays` as an optional web payment price config field.
- Validate `trialDays` in payments normalization:
  - Must be a positive integer.
  - Only allowed for subscription prices.
- Configure `trialDays: 7` on Pro monthly/yearly prices.
- Apply Stripe `trial_period_days` during subscription checkout only when the user has no qualifying historical subscription.
- Expose `trialDays` through payments schemas to web UI.
- Show trial copy on pricing cards for trial-enabled subscription prices.

## Impact
- Affected specs: `payments`
- Affected code:
  - `packages/app-config/src/types.ts`
  - `packages/app-config/src/payments/web.ts`
  - `packages/app-config/src/app-config.ts`
  - `apps/server/src/payments/**`
  - `apps/web/src/components/landing-page/tailark/pricing/**`
  - `packages/i18n/src/messages/web/*.json`
