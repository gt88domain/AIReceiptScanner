# Stripe Full Setup Guide

Complete walkthrough for setting up Stripe payments from scratch. Covers Sandbox selection, Product/Price creation, local webhook, and production go-live.

## Prerequisites

- Stripe account (https://dashboard.stripe.com)
- Stripe CLI installed: `brew install stripe/stripe-cli/stripe`
- `apps/server/.dev.vars` and `apps/server/.env.production` exist

## Step 1: Confirm Payment Provider

In `packages/app-config/src/app-config.ts`, set:
```typescript
web: {
  payments: {
    enabled: true,
    provider: "stripe",
  },
},
```

If Creem or another provider is active, comment it out — don't delete.

## Step 2: Select or Create a Stripe Sandbox

Stripe Sandboxes isolate test data from your live account.

1. In Stripe Dashboard, click the account picker (top-left)
2. Click **Switch to sandbox**
3. Select an existing sandbox or create a new one named after your project
4. **Confirm the sandbox name and account ID** (`acct_...`) before creating anything

The CLI does NOT auto-create Sandboxes. You must select one explicitly.

## Step 3: Get the Test Secret Key

1. In the selected Sandbox → Developers → API keys
2. Copy the test secret key (`sk_test_...`)
3. Write to `STRIPE_SECRET_KEY` in `apps/server/.dev.vars`

Verify the key belongs to the right account:
```bash
stripe accounts retrieve --api-key "$STRIPE_SECRET_KEY"
```

## Step 4: Create Products and Prices

Every Stripe CLI command must pass `--api-key` explicitly:

```bash
# Pro subscription product
stripe products create --name="Pro" --api-key "$STRIPE_SECRET_KEY"
# → prod_xxxx

# Pro monthly price ($10/month)
stripe prices create \
  --product=prod_xxxx \
  --currency=usd \
  --unit-amount=1000 \
  --recurring[interval]=month \
  --api-key "$STRIPE_SECRET_KEY"
# → price_monthly_xxxx

# Pro yearly price ($100/year)
stripe prices create \
  --product=prod_xxxx \
  --currency=usd \
  --unit-amount=10000 \
  --recurring[interval]=year \
  --api-key "$STRIPE_SECRET_KEY"
# → price_yearly_xxxx

# Lifetime product
stripe products create --name="Lifetime" --api-key "$STRIPE_SECRET_KEY"
# → prod_yyyy

# Lifetime price ($2,000 one-time)
stripe prices create \
  --product=prod_yyyy \
  --currency=usd \
  --unit-amount=200000 \
  --api-key "$STRIPE_SECRET_KEY"
# → price_lifetime_xxxx
```

## Step 5: Write Price IDs to App Config

Copy each `price_...` ID to the matching entry in `packages/app-config/src/app-config.ts`:

```typescript
plans: [
  { id: "free" },
  {
    id: "pro",
    prices: [
      {
        id: "monthly",
        provider: "stripe",
        test: { providerPriceId: "price_monthly_xxxx" },  // ← from step 4
        prod: { providerPriceId: "" },                     // ← fill after live setup
        currency: "usd",
        amountCents: 1000,
        priceType: "subscription",
        interval: "month",
        trialDays: 7,
        status: "active",
      },
      {
        id: "yearly",
        provider: "stripe",
        test: { providerPriceId: "price_yearly_xxxx" },
        prod: { providerPriceId: "" },
        currency: "usd",
        amountCents: 10000,
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
        test: { providerPriceId: "price_lifetime_xxxx" },
        prod: { providerPriceId: "" },
        currency: "usd",
        amountCents: 200000,
        priceType: "lifetime",
        status: "active",
      },
    ],
  },
],
```

If the app has credit packages, create their one-time prices in the same sandbox and write the IDs to `web.credits.packages` in `app-config.ts`.

## Step 6: Set Up Local Webhook

```bash
# Start webhook forwarding
stripe listen --api-key "$STRIPE_SECRET_KEY" \
  --forward-to http://localhost:3001/api/webhooks/stripe

# Copy the whsec_... from the output
# Write to STRIPE_WEBHOOK_SECRET in apps/server/.dev.vars
```

Restart the server after updating `STRIPE_WEBHOOK_SECRET`.

## Step 7: Local Verification

```bash
pnpm dev:web+server
```

1. Trigger a test event:
   ```bash
   stripe trigger checkout.session.completed --api-key "$STRIPE_SECRET_KEY"
   ```
   Confirm server logs show `POST /api/webhooks/stripe → 200`.

2. Full checkout flow:
   - Go to the pricing page
   - Click a plan → redirected to Stripe Checkout
   - Use test card `4242 4242 4242 4242`, any future expiry, any CVC
   - Complete checkout → redirected to success page
   - Check billing page → subscription shows active

## Step 8: Production Setup

Do not create production prices unless the user explicitly confirms the live Stripe account.

1. Get the live secret key (`sk_live_...`) from the live Stripe account
2. Write to `STRIPE_SECRET_KEY` in `apps/server/.env.production`
3. Create live Products/Prices in the live account (same structure as test)
4. Write live `price_...` IDs to `prod.providerPriceId` in `app-config.ts`
5. In Stripe Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `{SERVER_URL}/api/webhooks/stripe`
   - Copy the Signing secret to `STRIPE_WEBHOOK_SECRET` in `.env.production`
6. Enable Billing Portal: Stripe Dashboard → Settings → Billing → Customer portal
7. Deploy:
   ```bash
   pnpm deploy:server
   pnpm -F server secrets:bulk:production
   ```

## Step 9: Post-Deploy Verification

- Visit production Web → pricing page shows correct plans
- Test a real checkout (or use a test card in the Sandbox if you haven't switched to live yet)
- Check Stripe Dashboard → Payments → confirm events are received
- Check billing management page works
