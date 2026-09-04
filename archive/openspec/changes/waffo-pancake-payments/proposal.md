## Why

The project already has a provider-based billing system, but it cannot route web checkout or webhook fulfillment through Waffo Pancake. Adding Waffo support lets the web app use Waffo as a Merchant of Record provider for test-mode subscriptions, lifetime purchases, and later credit package purchases without bypassing the existing billing model.

## What Changes

- Add Waffo Pancake as a supported web/server payment provider alongside Stripe, Creem, and RevenueCat.
- Use `@waffo/pancake-ts` server-side only for checkout creation and webhook verification.
- Support Waffo checkout sessions for web subscription and one-time lifetime prices using configured Waffo Product IDs.
- Add a Waffo webhook endpoint that verifies raw request bodies and maps supported Waffo events into existing billing subscriptions, purchases, checkout sessions, and idempotent billing events.
- Keep provider secrets in server environment variables and avoid exposing Waffo private keys to browser code.
- Preserve existing payment policy, entitlement resolution, and cross-provider upgrade behavior.
- Defer unsupported provider features, such as customer portal or direct subscription plan mutation, unless Waffo APIs provide an equivalent contract.

## Capabilities

### New Capabilities

- `waffo-pancake-payments`: Web checkout and webhook fulfillment through Waffo Pancake using the existing EasyStarter payment provider architecture.

### Modified Capabilities

None.

## Impact

- Affected packages: `packages/app-config`, `apps/server`, and selected `apps/web` checkout redirect code.
- New dependency: `@waffo/pancake-ts` in `apps/server`.
- New environment variables: `WAFFO_MERCHANT_ID`, `WAFFO_PRIVATE_KEY`, and Waffo environment selection for test/prod behavior.
- New webhook route: `POST /api/webhooks/waffo`.
- Billing data continues to use existing Drizzle tables for customers, checkout sessions, subscriptions, purchases, and webhook events.
