# Change: Refactor payments provider selection

## Why
Payments currently rely on a registry pattern and a hardwired Stripe provider. We want a config-driven provider selector with caching and provider factories to simplify future providers while keeping the payment service as the orchestration layer.

## What Changes
- Replace registry usage with `getPaymentProvider()` selector.
- Add `serverConfig.payments` to choose the default provider.
- Convert Stripe provider to a factory with explicit config validation.

## Impact
- Affected code: `apps/server/src/payments/*`, `apps/server/src/configs/*`.
- Behavior: unchanged for Stripe; provider selection now follows server config.
