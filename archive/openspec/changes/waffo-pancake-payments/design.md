## Context

EasyStarter already routes web billing through a server-side `PaymentProvider` abstraction. Stripe and Creem own web checkout, RevenueCat owns native purchases, and all providers feed the same billing tables for customers, checkout sessions, subscriptions, purchases, and webhook events. Waffo Pancake should fit into this model instead of introducing a parallel checkout or entitlement system.

The server runs on Cloudflare Workers with `nodejs_compat` enabled. Waffo integration must keep the merchant private key server-only, read webhook bodies as raw text, and support the Waffo test environment first. The current request includes a Merchant ID but still needs a real private key before runtime validation.

## Goals / Non-Goals

**Goals:**

- Register Waffo as a supported web/server payment provider.
- Create Waffo checkout sessions for configured subscription and one-time product prices.
- Verify Waffo webhook signatures from raw request bodies and fulfill billing state through existing persistence paths.
- Preserve existing checkout policy, entitlement resolution, and cross-provider behavior.
- Keep Waffo secrets in server runtime environment variables.

**Non-Goals:**

- Do not replace Stripe, Creem, or RevenueCat.
- Do not add a second billing schema or provider-specific entitlement model.
- Do not implement Waffo production publishing or product creation automation in the first pass.
- Do not claim support for direct subscription plan changes until Waffo exposes an API contract that maps cleanly to the existing provider interface.

## Decisions

### Add Waffo as a normal payment provider

Waffo will be added to `SUPPORTED_WEB_PAYMENT_PROVIDERS` and therefore to `SUPPORTED_SERVER_PAYMENT_PROVIDERS`. The server provider registry will instantiate a Waffo provider that implements the existing `PaymentProvider` interface.

Alternative considered: add standalone Waffo checkout endpoints. This would duplicate checkout policy, customer reuse, checkout session persistence, and webhook idempotency, so it is rejected.

### Treat Waffo Product IDs as provider price IDs

The existing web catalog stores `providerPriceId` for Stripe price IDs and Creem product IDs. Waffo checkout also needs a Product ID, so the Waffo Product ID will use the same field. The Waffo SDK accepts `productId` and auto-detects product type server-side, so EasyStarter uses the local price type for billing records and relies on the configured Waffo Product ID to match the intended one-time or subscription product.

Alternative considered: add Waffo-specific product fields to app config. This would spread provider conditionals into shared config and is unnecessary for the current catalog shape.

### Keep Waffo checkout creation server-side

`@waffo/pancake-ts` will only be imported from `apps/server`. Checkout creation will pass currency, buyer email, success URL, metadata, and product type. Browser code will continue calling the existing oRPC checkout mutation.

Alternative considered: use Waffo hosted checkout links directly in web components. This would skip local checkout session records and provider metadata needed by webhooks, so it is rejected.

### Fulfill webhooks through existing billing handlers

The Waffo webhook endpoint will call `context.payments.handleWebhookEvent({ provider: "waffo", ... })`. The application service will persist `billingEvent` rows before dispatch, then route the parsed payload to a Waffo event handler. That handler will upsert customers, subscriptions, purchases, checkout status, and credit orders using the same repository/service helpers used by Stripe and Creem.

Alternative considered: process webhooks inside the Hono route. This would bypass provider-level idempotency and make retry behavior inconsistent.

### Fail unsupported provider operations explicitly

Waffo hosted consumer portal sessions resolve to Waffo's unified consumer portal login URL. Waffo subscription cancellation maps to cancel-at-period-end behavior. If Waffo does not provide a verified equivalent for cancel reactivation or direct subscription plan changes, the Waffo provider will throw descriptive errors. UI and service behavior can then avoid or surface unsupported actions without silent no-ops.

Alternative considered: emulate provider management locally. This would make local billing state diverge from Waffo and risks granting access incorrectly.

## Risks / Trade-offs

- Waffo webhook payload shape may differ from examples -> Implement minimal typed payload shapes around fields actually consumed, and fall back to stored checkout session metadata when payload metadata is sparse.
- Waffo checkout may not support per-session trial suppression like Stripe -> Preserve current trial policy only for providers with per-checkout support and avoid promising repeat-trial prevention for Waffo until verified.
- Direct upgrades may not map to the existing provider interface -> Treat these operations as unsupported until Waffo API behavior is confirmed.
- Waffo merchant API supports canceling subscriptions at period end, but not cancel reactivation -> Support `cancelAtPeriodEnd: true` and fail explicitly for `false`.
- Waffo hosted portal uses a unified consumer login rather than a customer-scoped session -> Return Waffo's consumer portal login URL and let Waffo handle customer magic-link authentication.
- Private key is not yet available -> Land configuration structure and fail fast with clear missing-env errors at runtime.
- Checkout opened in the same tab can lose merchant page state -> Prefer opening Waffo checkout in a new tab where the selected price provider is Waffo.

## Migration Plan

1. Add Waffo to provider enums and package configuration.
2. Configure Waffo Product IDs in `app-config` for the test environment.
3. Add server environment variables through `.dev.vars` locally and Wrangler secrets remotely.
4. Deploy the server webhook endpoint and register the test webhook URL in Waffo.
5. Run a sandbox checkout with a Waffo test card and confirm webhook-driven billing state.

Rollback is configuration-based: switch web payment prices back to Stripe or Creem and remove the Waffo webhook registration. Persisted Waffo billing rows can remain historical records because provider keys isolate them from other providers.

## Open Questions

- Will the project use Waffo for memberships only in the first pass, or also for credit package purchases?
- Which Waffo subscription management APIs should be mapped to direct upgrade flows, if any?
