---
name: easystarter-mobile-iap-products
description: Plan and create App Store Connect and Google Play in-app purchase products for EasyStarter Mobile. Use when someone says "set up IAP products", "create App Store subscriptions", "Google Play in-app products", "product IDs for purchases", "plan store products", "subscription setup in App Store Connect", "what product IDs do I need", or "map products to app-config".
---

# EasyStarter Mobile IAP Products

Create store product identifiers in App Store Connect and Google Play Console that exactly match the `providerPriceId` / `providerProductId` values in `app-config.ts`. Product IDs are permanent after the first purchase -- get them right before creating anything in the stores.

## Decision Tree

- **Plan product IDs for a new app** -> Section 1 (ID naming) + Section 2 (current catalog)
- **Create iOS subscription products** -> Section 3 (App Store Connect)
- **Create Android subscription products** -> Section 4 (Google Play Console)
- **Create credit (consumable) products** -> Section 5 (credit products)
- **Product ID mismatch error at runtime** -> Section 6 (validation rules)

## Section 1: Product ID Naming Convention

Store product IDs appear in `providerPriceId` (subscriptions/lifetime) and `providerProductId` (credits) in `app-config.ts`. These map directly to what you create in App Store Connect / Google Play Console.

Naming pattern: `{appname}_{price}_{interval}` or `{appname}_credits_{package}_{platform}`

The IDs are case-sensitive and permanent per store. Plan them before creating.

## Section 2: Current Product Catalog

### iOS Subscription/Lifetime Products

From `packages/app-config/src/app-config.ts`, `native.payments.ios`:

| Plan ID | Price ID | `providerPriceId` | Type | Price |
|---------|----------|--------------------|------|-------|
| `pro` | `monthly` | `easystarternative_10_1m` | subscription (month) | $10.00 |
| `pro` | `yearly` | `easystarternative_100_1y` | subscription (year) | $100.00 |
| `lifetime` | `lifetime` | `easystarternative_299_lifetime` | lifetime | $2,000.00 |

### Android Subscription Products

From `packages/app-config/src/app-config.ts`, `native.payments.android`:

| Plan ID | Price ID | `providerPriceId` | Type | Price |
|---------|----------|--------------------|------|-------|
| `pro` | `monthly` | `pro_monthly_android` | subscription (month) | $8.00 |
| `pro` | `yearly` | `pro_yearly_android` | subscription (year) | $80.00 |

### iOS Credit Products (Consumable)

From `packages/app-config/src/app-config.ts`, `nativeCreditPackages`:

| Package ID | `providerProductId` | Credits | Price |
|------------|---------------------|---------|-------|
| `starter` | `easystarter_credits_starter_ios` | 100 | $4.99 |
| `growth` | `easystarter_credits_growth_ios` | 500 | $19.99 |

### Android Credit Products (Consumable)

| Package ID | `providerProductId` | Credits | Price |
|------------|---------------------|---------|-------|
| `starter` | `easystarter_credits_starter_android` | 100 | $4.99 |
| `growth` | `easystarter_credits_growth_android` | 500 | $19.99 |

## Section 3: App Store Connect Setup

For each iOS subscription product:

1. Go to App Store Connect -> Your App -> Subscriptions
2. Create a Subscription Group (e.g., "Pro Plans")
3. Add subscription products with these exact Product IDs:
   - `easystarternative_10_1m` -- auto-renewable, 1 month, $9.99
   - `easystarternative_100_1y` -- auto-renewable, 1 year, $99.99
4. For lifetime: go to In-App Purchases -> Non-Consumable
   - `easystarternative_299_lifetime` -- non-consumable

Product types in App Store Connect:
- **Auto-Renewable Subscription** -- for `subscription` priceType
- **Non-Consumable** -- for `lifetime` priceType
- **Consumable** -- for credit packages (see Section 5)

The bundle identifier in App Store Connect must match `app.json` -> `ios.bundleIdentifier` (currently `native.easystarter.dev`).

## Section 4: Google Play Console Setup

For each Android subscription product:

1. Go to Google Play Console -> Your App -> Monetize -> Subscriptions
2. Create subscription products:
   - Product ID `pro_monthly_android` -- base plan: 1 month
   - Product ID `pro_yearly_android` -- base plan: 1 year
3. Set pricing in each base plan's offers

The package name in Google Play Console must match `app.json` -> `android.package` (currently `xnative.easystarter.dev`).

## Section 5: Credit Products (Consumable)

Credit packages are store products that trigger server-side credit grants via RevenueCat webhooks. They use a different product type than subscriptions.

**App Store Connect**: Create as **Consumable** in-app purchases:
- `easystarter_credits_starter_ios`
- `easystarter_credits_growth_ios`

**Google Play Console**: Create as **Managed products** (one-time/consumable):
- `easystarter_credits_starter_android`
- `easystarter_credits_growth_android`

These products are purchased through RevenueCat as `NON_SUBSCRIPTION` category:

```typescript
// apps/native/lib/payments/revenuecat.ts — purchaseCreditPackage()
const products = await Purchases.getProducts(
  [product.providerProductId],
  Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
);
```

## Section 6: Validation Rules

Native plan IDs MUST match web plan IDs. The function `validateNativePlansAgainstWebSemanticSource()` in `packages/app-config/src/payments/native.ts` enforces this at startup:

```typescript
// packages/app-config/src/payments/native.ts
function validateNativePlansAgainstWebSemanticSource(plans: NormalizedNativePlan[]) {
  for (const plan of plans) {
    const matchingWebPlan = webSemanticPlans.find((webPlan) => webPlan.id === plan.id);
    if (!matchingWebPlan) {
      throw new Error(
        `[native payments] Unknown native plan id "${plan.id}" not found in web payments config.`
      );
    }
    // Also validates priceType, interval, and status match
  }
}
```

This means:
- Every native plan ID (e.g., `pro`, `lifetime`) must exist in `web.payments.plans`
- Every native price ID (e.g., `monthly`, `yearly`) must exist under the matching web plan
- `priceType` and `interval` must match between web and native

Credit package IDs (`starter`, `growth`) are independent and do not need to match web plan IDs.

## Common Mistakes

- **Product ID typo in `app-config.ts` vs what was created in the store** -- the `providerPriceId` must be character-for-character identical to the store product ID. RevenueCat looks up products by this exact string.
- **Using offering IDs instead of product IDs in `providerPriceId`** -- RevenueCat offerings are groupings, not products. The `providerPriceId` field must contain the actual App Store / Google Play product identifier.
- **Wrong product type in the store** -- subscriptions must be "auto-renewable subscription" in App Store Connect, lifetime must be "non-consumable", and credit packages must be "consumable". Using the wrong type causes purchase flow errors.
- **Native plan ID that does not exist on web** -- the validator throws at app startup. If you add a native-only plan, you must also add a matching plan entry (even without prices) in `web.payments.plans`.
- **Creating store products before planning IDs** -- store product IDs are permanent after the first purchase. Plan all IDs against `app-config.ts` first, then create in the stores.
- **Forgetting Android credit products** -- if `nativeCreditPackages` has `native.android` entries, those product IDs must exist in Google Play Console too.

## Verification

1. Every `providerPriceId` in `app-config.ts` `native.payments.ios.plans` has a matching App Store Connect product
2. Every `providerPriceId` in `app-config.ts` `native.payments.android.plans` has a matching Google Play product
3. Every `providerProductId` in `nativeCreditPackages` has a matching store consumable product
4. `pnpm check-types` passes after any catalog edits
5. All native plan IDs exist in `web.payments.plans` (checked automatically at startup)
