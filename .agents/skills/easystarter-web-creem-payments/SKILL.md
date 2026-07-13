---
name: easystarter-web-creem-payments
description: Configure Creem payments for EasyStarter Web. Use when the user mentions Creem, Creem payments, Creem checkout, Creem webhook, CREEM_API_KEY, CREEM_WEBHOOK_SECRET, switching from Stripe to Creem, Creem product IDs, Creem billing, Creem subscriptions, or asks "how do I set up Creem", "switch to Creem", "configure Creem payments", or "Creem webhook not working".
---

# EasyStarter Web Creem Payments

Creem is an alternative to Stripe for web billing. The key differences: Creem uses **product IDs** (`prod_...`) instead of price IDs (`price_...`), requires **ngrok for local webhook testing** (no CLI equivalent to `stripe listen`), and has a **test/live API key prefix** that auto-routes to the correct environment.

## Decision Tree

- **Switch from Stripe to Creem** -> Section 1 (config) + Section 2 (env vars) + Section 3 (price IDs)
- **Set up Creem webhooks** -> Section 4 (webhook setup)
- **Test Creem locally** -> Section 4 (ngrok) + Section 2 (test key)
- **Creem checkout or webhook not working** -> Section 5 (common mistakes)

## Section 1: App-Config Provider Switch

Change the payment provider in `packages/app-config/src/app-config.ts`:

```typescript
// packages/app-config/src/app-config.ts — web.payments
payments: {
  enabled: true,
  provider: "creem",  // Changed from "stripe"
  plans: [
    {
      id: "free",  // No price needed for free tier
    },
    {
      id: "pro",
      prices: [
        {
          id: "monthly",
          provider: "creem",  // Each price specifies its provider
          test: {
            providerPriceId: "prod_XXXXX",  // Creem PRODUCT ID (not price_)
          },
          prod: {
            providerPriceId: "prod_YYYYY",
          },
          currency: "usd",
          amountCents: 1000,
          priceType: "subscription",
          interval: "month",
          trialDays: 7,
          status: "active",
        },
      ],
    },
  ],
},
```

**Critical**: Creem `providerPriceId` values are Creem **product IDs** (prefixed `prod_`), not Stripe-style price IDs (prefixed `price_`). The naming is confusing because the field is called `providerPriceId` but Creem maps it to a product.

Also update credit packages if credits are enabled:

```typescript
// Each web credit package's provider field
web: {
  provider: "creem",  // Changed from "stripe"
  test: { providerPriceId: "prod_CREDITS_XXXXX" },
  prod: { providerPriceId: "prod_CREDITS_YYYYY" },
},
```

## Section 2: Environment Variables

| Variable | Where | Scope | Format |
|----------|-------|-------|--------|
| `CREEM_API_KEY` | `apps/server/.dev.vars` + `.env.production` | **Secret** | `creem_test_xxxx` (test) or `creem_live_xxxx` (prod) |
| `CREEM_WEBHOOK_SECRET` | `apps/server/.dev.vars` + `.env.production` | **Secret** | Hex string from Creem dashboard |

The API key prefix auto-selects the Creem environment:

```typescript
// apps/server/src/payments/providers/creem/shared.ts
export function resolveCreemApiBaseUrl(apiKey: string) {
  if (apiKey.startsWith("creem_test_")) {
    return "https://test-api.creem.io/v1";
  }
  return "https://api.creem.io/v1";
}
```

Use `creem_test_` prefix for development. Use `creem_live_` for production.

## Section 3: How Creem Checkout Works

The checkout flow creates a Creem checkout session using the product ID:

```typescript
// apps/server/src/payments/providers/creem/shared.ts
export function pickCreemProductId(lineItems: CheckoutLineItem[]) {
  const productId = lineItems[0]?.priceId;
  if (!productId) {
    throw new Error("Creem checkout is missing checkout product");
  }
  return productId;
}
```

The checkout request sends the product ID to Creem's `/checkouts` endpoint:

```typescript
// apps/server/src/payments/providers/creem/provider.ts
const session = await creemRequest<CreemCreateCheckoutResponse>("/checkouts", {
  method: "POST",
  body: {
    product_id: productId,
    request_id: crypto.randomUUID(),
    units: lineItem.quantity,
    success_url: input.successUrl,
    metadata: input.metadata,
  },
});
```

## Section 4: Webhook Setup

Creem webhook endpoint is at `/api/webhooks/creem` on the server.

**Local development** -- Creem has no CLI like `stripe listen`. Use ngrok:

```bash
# Start ngrok tunnel to the server port
ngrok http 3001
# Copy the ngrok URL and set it as webhook URL in Creem dashboard:
# https://xxxx.ngrok.io/api/webhooks/creem
```

**Production** -- Set the webhook URL in the Creem dashboard to:
```
https://your-server-url/api/webhooks/creem
```

Webhook signature verification uses HMAC-SHA256:

```typescript
// apps/server/src/payments/providers/creem/shared.ts
export function verifyCreemWebhookSignature(input: {
  rawBody: string;
  signature: string;
  secret: string;
}) {
  const expected = createHmac("sha256", input.secret)
    .update(input.rawBody)
    .digest("hex");
  // ... timing-safe comparison
}
```

The `CREEM_WEBHOOK_SECRET` must match what is configured in the Creem dashboard webhook settings.

## Section 5: Creem Subscription State Mapping

Creem subscription states are mapped to the app's internal status model:

```typescript
// apps/server/src/payments/providers/creem/shared.ts
// Creem "scheduled_cancel" -> app { status: "active", cancelAtPeriodEnd: true }
// Creem "active"            -> app { status: "active", cancelAtPeriodEnd: false }
// Creem "trialing"          -> app { status: "trialing" }
// Creem "paused"            -> app { status: "paused" }
// Creem "past_due"/"unpaid" -> app { status: "unpaid" }
// Creem "canceled"/"expired"-> app { status: "canceled" }
```

## Verification

1. Set `CREEM_API_KEY` (with `creem_test_` prefix) and `CREEM_WEBHOOK_SECRET` in `apps/server/.dev.vars`
2. Update `web.payments.provider` to `"creem"` and plan `providerPriceId` values to Creem product IDs
3. Start ngrok: `ngrok http 3001`
4. Set the ngrok webhook URL in Creem dashboard
5. `pnpm dev:web+server`
6. Click a pricing plan, complete Creem test checkout
7. Verify the webhook fires and subscription status updates

## Common Mistakes

- **Using `price_` IDs instead of `prod_` IDs** -- Creem uses product IDs (`prod_XXXXX`), not price IDs. The `providerPriceId` field in app-config is misleadingly named for Creem. Look up product IDs in the Creem dashboard under Products.
- **Forgetting ngrok for local webhooks** -- Unlike Stripe which has `stripe listen`, Creem requires an external tunnel. Without ngrok, webhooks cannot reach your local server, so checkout completes but the subscription status never updates.
- **Wrong webhook URL path** -- The Creem webhook endpoint is `/api/webhooks/creem`, not `/api/webhooks/stripe`. Each provider has its own webhook path.
- **Mixing test and live product IDs** -- `creem_test_` API keys only work with test-mode products. If `providerPriceId` in `test` has a live product ID, checkout fails with a Creem API error.
- **Forgetting to update BOTH payment plans AND credit packages** -- If credits are enabled, both `web.payments.plans` and `web.credits.packages` need their `provider` changed to `"creem"` and `providerPriceId` updated to Creem product IDs.
- **Missing `CREEM_WEBHOOK_SECRET`** -- The provider throws `"Missing CREEM_WEBHOOK_SECRET"` if the secret is not set. The webhook signature verification fails and events are rejected.
