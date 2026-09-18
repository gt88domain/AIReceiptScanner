# RevenueCat Setup Guide

Complete RevenueCat dashboard and code configuration walkthrough.

## Step 1: Create RevenueCat Project

1. Go to [app.revenuecat.com](https://app.revenuecat.com) and create a new project
2. Name it after your app (e.g., "EasyStarterNative")

## Step 2: Add Platform Apps

### iOS App
1. In your project, go to Apps -> Add New
2. Select "App Store"
3. Enter your App Store Connect app name
4. Paste your App Store Connect Shared Secret (from App Store Connect -> Your App -> General -> App Information -> App-Specific Shared Secret)
5. Copy the generated **Public API Key** (starts with `appl_`)
6. Set this as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` in `apps/native/eas.json`

### Android App (if applicable)
1. Add another app, select "Google Play"
2. Upload your Google Play service account JSON key
3. Copy the generated **Public API Key** (starts with `goog_`)
4. Set this as `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` in `apps/native/eas.json`

## Step 3: Import Products

Products must already exist in App Store Connect / Google Play Console before importing.

1. Go to Products in RevenueCat
2. Click "Set up a new product"
3. For each product, enter the exact store product identifier:

**iOS Subscriptions:**
- `easystarternative_10_1m`
- `easystarternative_100_1y`

**iOS Non-Consumable (Lifetime):**
- `easystarternative_299_lifetime`

**iOS Consumable (Credits):**
- `easystarter_credits_starter_ios`
- `easystarter_credits_growth_ios`

**Android Subscriptions:**
- `pro_monthly_android`
- `pro_yearly_android`

**Android Consumable (Credits):**
- `easystarter_credits_starter_android`
- `easystarter_credits_growth_android`

## Step 4: Create Entitlements

1. Go to Entitlements -> Create New
2. Identifier: `pro` (must match `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`)
3. Attach these products to the `pro` entitlement:
   - All subscription products (monthly, yearly for both platforms)
   - The lifetime product
4. Do NOT attach credit products to any entitlement -- they are consumable purchases that grant credits, not premium access

## Step 5: Create Offerings

1. Go to Offerings -> Create New
2. Set as the Current Offering
3. Add packages:
   - Package for monthly subscription (identifier: e.g., `$rc_monthly`)
   - Package for yearly subscription (identifier: e.g., `$rc_annual`)
   - Package for lifetime (identifier: e.g., `$rc_lifetime`)
4. Each package must reference the correct platform product

## Step 6: Configure Webhook

1. Go to Project Settings -> Webhooks
2. Click "Add Endpoint"
3. URL: `https://your-server.example.com/api/webhooks/revenuecat`
4. Generate an authorization header value and save it
5. Set this value as `REVENUECAT_WEBHOOK_SECRET`:
   - Local dev: `apps/server/.dev.vars`
   - Production: `wrangler secret put REVENUECAT_WEBHOOK_SECRET`

Events the server handles:
- `INITIAL_PURCHASE`
- `RENEWAL`
- `CANCELLATION`
- `EXPIRATION`
- `NON_RENEWING_PURCHASE` (credit purchases)

## Step 7: Verify SDK Configuration

The SDK is configured automatically by the auth provider. To verify:

```bash
pnpm dev:native+server
```

1. Sign in to the app
2. Check native console for `[Purchases]` debug logs (enabled in dev)
3. Navigate to the premium/subscription screen
4. Verify offerings load with correct products and pricing

## Step 8: Test Sandbox Purchase

1. On iOS simulator or device with sandbox Apple ID:
   - Navigate to premium screen
   - Select a subscription plan
   - Complete sandbox purchase
2. Check:
   - App UI reflects premium access
   - Server logs show webhook received
   - Database has billing subscription record

## Troubleshooting

### "No offerings found"
- Products not imported into RevenueCat
- Products not added to any offering
- Products not yet approved in App Store Connect (must be at least "Ready to Submit")
- Wrong API key for the platform

### "Purchase completed but no entitlement"
- Product not attached to the `pro` entitlement in RevenueCat
- Webhook not configured or URL is wrong
- `REVENUECAT_WEBHOOK_SECRET` mismatch between RevenueCat and server

### "Anonymous user webhook error in server logs"
- Purchase happened before `syncAppUser()` completed
- The auth provider should sync identity before enabling purchase flows
- Check that `isPaymentsReady` is `true` before allowing purchases

### "Credit purchase succeeded but balance unchanged"
- Webhook for `NON_RENEWING_PURCHASE` not arriving
- Credit product ID not matching any `providerProductId` in `nativeCreditPackages`
- The client polls for 30 seconds after purchase -- check if the webhook arrives within that window
