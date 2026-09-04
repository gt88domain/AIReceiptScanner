---
name: easystarter-web-stripe-payments
description: Configure Stripe payments for EasyStarter Web end-to-end. Use whenever the user mentions Stripe, payments, subscriptions, checkout, billing portal, pricing plans, webhook secret, price IDs, test cards, lifetime purchase, or asks why checkout fails or webhook returns errors.
---

# EasyStarter Web Stripe Payments

Stripe integration connects four pieces: the **payment plans in `app-config.ts`** that define your product catalog, the **Stripe Dashboard** where the actual Products/Prices live, the **server provider** that handles checkout sessions and webhooks, and the **environment variables** that authenticate everything. A price ID mismatch between `app-config.ts` and Stripe Dashboard is the most common cause of checkout failures.

## Decision Tree

- **Set up Stripe from scratch** → Read `references/stripe-setup-guide.md` for the full walkthrough
- **Add or change a plan/price** → Section 1 (plan config) + create the Price in Stripe first
- **Fix checkout/webhook errors** → Section 3 (webhook) + Section 5 (common mistakes)
- **Production go-live** → Section 4 (production setup)

## Section 1: Payment Plan Configuration

All plans are defined in `packages/app-config/src/app-config.ts` under `web.payments`:

```typescript
// packages/app-config/src/app-config.ts — lines ~261-334
payments: {
  enabled: true,
  provider: "stripe",
  plans: [
    {
      id: "free",
      // No prices — free tier has no checkout
    },
    {
      id: "pro",
      prices: [
        {
          id: "monthly",
          provider: "stripe",
          test: { providerPriceId: "price_1Xxx..." },    // Stripe test mode
          prod: { providerPriceId: "price_1Yyy..." },    // Stripe live mode
          currency: "usd",
          amountCents: 1000,        // $10.00
          priceType: "subscription",
          interval: "month",
          trialDays: 7,
          status: "active",
        },
        {
          id: "yearly",
          provider: "stripe",
          test: { providerPriceId: "price_1Xxx..." },
          prod: { providerPriceId: "price_1Yyy..." },
          currency: "usd",
          amountCents: 10000,       // $100.00
          priceType: "subscription",
          interval: "year",
          trialDays: 7,
          status: "active",
        },
      ],
    },
    {
      id: "lifetime",
      prices: [
        {
          id: "lifetime",
          provider: "stripe",
          test: { providerPriceId: "price_1Xxx..." },
          prod: { providerPriceId: "price_1Yyy..." },
          currency: "usd",
          amountCents: 200000,      // $2,000.00
          priceType: "lifetime",
          status: "active",
        },
      ],
    },
  ],
},
```

### Key rules for plan config

- **`providerPriceId` must be a real Stripe Price ID** (`price_...`) — create the Price in Stripe Dashboard first, then copy the ID here
- **`test` and `prod` use separate Price IDs** — test prices come from a Stripe Sandbox, production prices from the live account
- The runtime auto-selects `test` vs `prod` based on `NODE_ENV` (see `resolveProviderPriceEnvironment()` in `packages/app-config/src/payments/web.ts`)
- **`amountCents` must match the Stripe Price** — this is for UI display, not for charging. A mismatch confuses users but doesn't break billing
- **Plan `id` values are stable** — translations, billing logic, and order history reference them. Don't rename after launch
- Set `status: "archived"` to hide a plan from the pricing page without breaking existing subscribers

## Section 2: Provider Configuration

The provider is set in one place:

```typescript
// packages/app-config/src/app-config.ts
web: {
  payments: {
    provider: "stripe",
  },
},
```

The server payment router automatically uses the matching provider implementation:
- Stripe: `apps/server/src/payments/providers/stripe/provider.ts`
- Webhook handler: `apps/server/src/payments/providers/stripe/webhook/handle-event.ts`
- Web payment routes: `apps/server/src/routers/web/payments.ts`

Stripe is the only active Web payment provider. Update its price IDs and environment variables for each deployment.

## Section 3: Environment Variables

| Variable | Where | Notes |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | `apps/server/.dev.vars` + `.env.production` | `sk_test_...` for dev, `sk_live_...` for production |
| `STRIPE_WEBHOOK_SECRET` | `apps/server/.dev.vars` + `.env.production` | `whsec_...` from Stripe CLI (dev) or Dashboard (prod) |

Both are secrets — never put them in `wrangler.jsonc` or Web env files.

## Section 4: Webhook Configuration

The webhook endpoint is: `{SERVER_URL}/api/webhooks/stripe`

### Local development (Stripe CLI)

```bash
# Install if needed (macOS)
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to local server
stripe listen --forward-to http://localhost:3001/api/webhooks/stripe

# Copy the whsec_... output to apps/server/.dev.vars:
# STRIPE_WEBHOOK_SECRET=whsec_...
```

**Important Stripe CLI rule**: always pass `--api-key` explicitly when creating resources to target the correct Sandbox:

```bash
# Verify which account a key belongs to
stripe accounts retrieve --api-key "$STRIPE_SECRET_KEY"

# Create products/prices in the correct sandbox
stripe products create --name="Pro" --api-key "$STRIPE_SECRET_KEY"
stripe prices create \
  --product=prod_xxx \
  --currency=usd \
  --unit-amount=1000 \
  --recurring[interval]=month \
  --api-key "$STRIPE_SECRET_KEY"
```

### Testing locally

```bash
# Trigger a test event
stripe trigger checkout.session.completed --api-key "$STRIPE_SECRET_KEY"

# Verify server receives POST /api/webhooks/stripe with HTTP 200
# A generic CLI trigger may not have app-specific metadata, so a skip log is acceptable
# if signature verification and delivery succeed

# Full flow test: use test card 4242 4242 4242 4242 in the checkout UI
```

### Production webhook

1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `{SERVER_URL}/api/webhooks/stripe`
3. Select relevant events (checkout.session.completed, invoice.paid, customer.subscription.*, etc.)
4. Copy the Signing secret to `STRIPE_WEBHOOK_SECRET` in `apps/server/.env.production`

## Section 5: Common Mistakes

- **Using a Price ID from the wrong Stripe account/sandbox** — always run `stripe accounts retrieve --api-key "$STRIPE_SECRET_KEY"` to confirm the account before creating Prices. Stripe CLI does not auto-create Sandboxes.
- **Mixing test and live Price IDs** — `test.providerPriceId` must be a test-mode Price, `prod.providerPriceId` must be live-mode. Cross-environment IDs silently fail at checkout.
- **Forgetting to restart server after changing `STRIPE_WEBHOOK_SECRET`** — Wrangler caches env on startup.
- **Not enabling Billing Portal in Stripe Dashboard** — the "Manage Subscription" link in the billing settings page opens Stripe's Customer Portal. It must be activated: Stripe Dashboard → Settings → Billing → Customer portal.
- **Deploying without pushing secrets** — after `pnpm deploy:server`, you must run `pnpm -F server secrets:bulk:production` to push env vars including `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

## Verification Checklist

After any payment change:

1. `pnpm dev:web+server` — start locally
2. Start Stripe CLI: `stripe listen --forward-to http://localhost:3001/api/webhooks/stripe`
3. Navigate to pricing page — plans should show correct prices
4. Test checkout with card `4242 4242 4242 4242` — should complete and redirect to success page
5. Check terminal — webhook should receive events with HTTP 200
6. Check billing page — subscription status should reflect
7. `pnpm check-types` — catch config type errors

## Related Files

| File | Purpose |
|------|---------|
| `packages/app-config/src/app-config.ts` | Plan catalog, provider selection |
| `packages/app-config/src/payments/web.ts` | Payment types, normalization, environment resolution |
| `apps/server/src/payments/providers/stripe/provider.ts` | Stripe checkout session creation |
| `apps/server/src/payments/providers/stripe/webhook/handle-event.ts` | Webhook event processing |
| `apps/server/src/routers/web/payments.ts` | oRPC payment routes |
| `apps/web/src/components/landing-page/tailark/pricing/pricing-section.tsx` | Pricing page UI |
| `apps/web/src/routes/_authed/(dashboard)/settings/billing.tsx` | Billing management page |
| `packages/shared/src/pricing-config.ts` | Shared pricing tier definitions |
