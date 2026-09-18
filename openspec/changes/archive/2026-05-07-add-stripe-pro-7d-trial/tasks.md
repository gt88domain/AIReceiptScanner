## 1. Implementation
- [x] 1.1 Add `trialDays` field to web payments config types and normalization.
- [x] 1.2 Configure Pro monthly/yearly Stripe prices with `trialDays: 7`.
- [x] 1.3 Add subscription-history trial eligibility query (exclude `incomplete`).
- [x] 1.4 Pass resolved `trialDays` from payment service to provider checkout input.
- [x] 1.5 Apply Stripe `trial_period_days` in checkout session `subscription_data`.
- [x] 1.6 Expose `trialDays` in payment schemas and pricing frontend types.
- [x] 1.7 Show trial copy in pricing cards and add i18n messages (`en/zh/jp`).
- [x] 1.8 Run `pnpm check-types` and `pnpm check`.
