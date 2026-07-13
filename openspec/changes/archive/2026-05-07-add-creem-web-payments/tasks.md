## 1. Implementation
- [x] 1.1 Add OpenSpec payments capability delta for Creem web billing behavior.
- [x] 1.2 Add failing tests for provider enums, paused subscription status, and Creem-aware billing policy behavior.
- [x] 1.3 Add Creem runtime configuration and provider registration without changing existing Stripe/RevenueCat contracts.
- [x] 1.4 Implement Creem checkout, portal, subscription upgrade, and webhook verification in the server provider layer.
- [x] 1.5 Persist Creem webhook events into existing billing customer, subscription, purchase, and checkout tables.
- [x] 1.6 Add database migration and schema changes for the `paused` subscription status.
- [x] 1.7 Update billing status resolution and web billing UI so Creem subscriptions can be managed and upgraded.
- [x] 1.8 Run `openspec validate add-creem-web-payments --strict --no-interactive` and `pnpm check-types`.
