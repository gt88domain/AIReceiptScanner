## 1. Provider Configuration

- [x] 1.1 Add `waffo` to supported web/server payment provider keys in `packages/app-config`.
- [x] 1.2 Add Waffo test/prod Product ID slots to web membership payment config for monthly, yearly, and lifetime prices.
- [x] 1.3 Decide whether web credit packages use Waffo in this change; if yes, add Waffo Product IDs to the web credit package config.
- [x] 1.4 Add server environment documentation or examples for `WAFFO_MERCHANT_ID`, `WAFFO_PRIVATE_KEY`, and Waffo environment selection.

## 2. Server SDK Provider

- [x] 2.1 Add `@waffo/pancake-ts` to `apps/server` dependencies.
- [x] 2.2 Implement a Waffo provider module that initializes the SDK from server runtime environment variables.
- [x] 2.3 Implement Waffo checkout creation using configured Waffo Product IDs for one-time and subscription products.
- [x] 2.4 Preserve checkout metadata for user ID, plan ID, price ID, provider, and credit order metadata when present.
- [x] 2.5 Register the Waffo provider in the payment provider registry.
- [x] 2.6 Return Waffo hosted consumer portal URLs from the provider portal session method.
- [x] 2.7 Support Waffo subscription cancel-at-period-end through the provider order cancellation API.
- [x] 2.8 Return explicit provider capability errors for unsupported cancel reactivation and direct plan-change operations until supported Waffo API mappings are confirmed.

## 3. Webhook Processing

- [x] 3.1 Add `POST /api/webhooks/waffo` in the Hono server and read the request body as raw text.
- [x] 3.2 Verify `x-waffo-signature` through the Waffo SDK before dispatching webhook events.
- [x] 3.3 Route Waffo parsed events through the existing payment service idempotency flow.
- [x] 3.4 Implement Waffo checkout/order event handling for completed one-time purchases and checkout session completion.
- [x] 3.5 Implement Waffo subscription event handling for activated, payment succeeded, canceling, uncanceled, updated, canceled, and past-due states.
- [x] 3.6 Implement Waffo refund handling for lifetime purchases and credit purchases where the original payment can be identified.
- [x] 3.7 Reuse stored checkout sessions and metadata as ownership fallbacks when Waffo webhook payloads are sparse.

## 4. Web Client Behavior

- [x] 4.1 Detect Waffo-selected checkout URLs in pricing and billing flows by using the selected price provider.
- [x] 4.2 Open Waffo hosted checkout in a new tab with `noopener,noreferrer`.
- [x] 4.3 Keep existing same-tab behavior for non-Waffo providers unless changing it is explicitly desired.
- [x] 4.4 Ensure Waffo-managed subscriptions do not expose direct management actions that the server provider marks unsupported.

## 5. Validation

- [x] 5.1 Run `pnpm check-types` after implementation and fix TypeScript issues until it passes.
- [ ] 5.2 Run the web and server dev flow with Waffo test credentials configured.
- [ ] 5.3 Register a Waffo test webhook URL using an HTTPS tunnel to the server port.
- [ ] 5.4 Complete a Waffo sandbox subscription checkout and verify billing status updates from webhook processing.
- [ ] 5.5 Complete a Waffo sandbox lifetime checkout and verify lifetime entitlement resolution.
- [ ] 5.6 Verify invalid or duplicate Waffo webhook deliveries do not mutate billing state twice.

Pending validation requires a real Waffo private key, Product IDs, and an HTTPS webhook tunnel.
