---
name: easystarter-mobile-credits
description: Configure the EasyStarter Mobile credit system for consumable in-app purchases. Use when someone says "set up credits", "enable credit purchases", "add credit packages", "credits not syncing after purchase", "debug credit purchase", "signup grant", "credit balance not updating", "consumable IAP", or "how do credits work on native".
---

# EasyStarter Mobile Credits

Native credits are consumable in-app purchases that grant a ledger balance through server-side webhook processing. The client buys a store product via RevenueCat, the `NON_RENEWING_PURCHASE` webhook fires, and the server grants credits. The client NEVER mutates the credit balance directly -- it polls the server until the balance updates.

## Decision Tree

- **Enable credits for the first time** -> Section 1 (config) + Section 2 (packages)
- **Add a new credit package** -> Section 2 (package structure)
- **Credits not appearing after purchase** -> Section 4 (purchase flow) + Common Mistakes
- **Configure signup grant** -> Section 3 (signup grant)
- **Debug a stuck purchase** -> Section 5 (sync and polling)
- **Consume credits in a feature** -> Section 6 (consumption)

## Section 1: Credits Configuration

Enable credits in `packages/app-config/src/app-config.ts`:

```typescript
// packages/app-config/src/app-config.ts — native.credits
native: {
  credits: {
    enabled: true,
    signupGrant: creditSignupGrant,    // { enabled: true, amount: 100, expiresInDays: 30 }
    packages: nativeCreditPackages,     // credit packages with native.ios/android products
  },
},
```

The `enabled` flag controls whether credit screens, queries, and purchase flows are available in the native app. The `useCredits()` hook checks this:

```typescript
// apps/native/hooks/use-credits.ts
const isAvailable =
  appConfig.creditsEnabled &&
  nativePlatform !== null &&
  nativePayments.getConfig().isAvailable &&
  isPaymentsReady;
```

## Section 2: Credit Package Structure

Each credit package defines how many credits to grant and which store product to purchase per platform:

```typescript
// packages/app-config/src/app-config.ts — nativeCreditPackages
const nativeCreditPackages = [
  {
    id: "starter",              // Internal ID used in ledger and i18n
    amount: 100,                // Credits granted on purchase
    native: {
      ios: {
        provider: "revenuecat",
        providerProductId: "easystarter_credits_starter_ios",   // App Store product ID
        currency: "usd",
        amountCents: 499,       // $4.99
        status: "active",
      },
      android: {
        provider: "revenuecat",
        providerProductId: "easystarter_credits_starter_android",  // Google Play product ID
        currency: "usd",
        amountCents: 499,
        status: "active",
      },
    },
  },
  {
    id: "growth",
    amount: 500,
    native: {
      ios: {
        provider: "revenuecat",
        providerProductId: "easystarter_credits_growth_ios",
        currency: "usd",
        amountCents: 1999,      // $19.99
        status: "active",
      },
      android: {
        provider: "revenuecat",
        providerProductId: "easystarter_credits_growth_android",
        currency: "usd",
        amountCents: 1999,
        status: "active",
      },
    },
  },
];
```

The `providerProductId` values must exactly match:
1. The product ID created in App Store Connect / Google Play Console
2. The product imported into RevenueCat

Credit packages are separate from subscription plans -- they are NOT validated against web plan IDs.

## Section 3: Signup Grant

New users can receive free credits on first interaction with the ledger:

```typescript
// packages/app-config/src/app-config.ts
const creditSignupGrant = {
  enabled: true,
  amount: 100,           // Credits granted
  expiresInDays: 30,     // Grant expires after 30 days
};
```

The normalized grant config from `packages/app-config/src/credits.ts`:

```typescript
// packages/app-config/src/credits.ts — normalizeGrant()
return {
  enabled: input.enabled ?? true,
  amount: input.amount,
  expiresInDays: input.expiresInDays ?? null,  // null = never expires
};
```

The grant is applied server-side when the user's credit balance is first queried. Set `enabled: false` or remove `signupGrant` to disable.

## Section 4: Purchase Flow

The full credit purchase flow:

1. User taps "Buy" in the credit screen
2. `useCredits().purchase(packageId)` is called
3. `nativePayments.purchaseCreditPackage({ packageId })` initiates the store purchase:

```typescript
// apps/native/lib/payments/revenuecat.ts — purchaseCreditPackage()
async purchaseCreditPackage(input: PurchaseCreditPackageInput) {
  this.configure();
  const product = this.getConfiguredCreditProduct(input.packageId);
  const products = await Purchases.getProducts(
    [product.providerProductId],
    Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
  );
  const productToPurchase =
    products.find((item) => item.identifier === product.providerProductId) ?? null;
  // ... purchase via Purchases.purchaseStoreProduct(productToPurchase)
}
```

4. Store purchase completes -> RevenueCat sends `NON_RENEWING_PURCHASE` webhook to server
5. Server webhook handler grants credits:

```typescript
// apps/server/src/payments/providers/revenuecat/webhook/handle-event.ts
if (event.type === "NON_RENEWING_PURCHASE") {
  await recordNativeCreditOrderPurchase(db, {
    user: { userId },
    packageId: mappedCreditPackage.package.id,
    platform: mappedCreditPackage.platform,
    sourceProvider: "revenuecat",
    sourceId: providerTransactionId,
  });
  return;
}
```

6. Client polls for updated balance (see Section 5)

## Section 5: Balance Sync and Polling

After a purchase, the client does NOT know the new balance immediately -- it must wait for the webhook to process. The `waitForBalanceSync()` function handles this:

```typescript
// apps/native/hooks/use-credits.ts
const CREDIT_SYNC_WINDOW_MS = 30_000;       // 30 second timeout
const CREDIT_SYNC_POLL_INTERVAL_MS = 3_000;  // Poll every 3 seconds

const waitForBalanceSync = useCallback(
  async (previousBalance: number | null) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < CREDIT_SYNC_WINDOW_MS) {
      const result = await balanceQuery.refetch();
      const nextBalance = result.data?.balance ?? null;
      if (previousBalance === null || (nextBalance !== null && nextBalance > previousBalance)) {
        return true;   // Balance increased, credits granted
      }
      await sleep(CREDIT_SYNC_POLL_INTERVAL_MS);
    }
    return false;  // Timed out -- webhook may be delayed
  },
  [balanceQuery],
);
```

The purchase function coordinates the flow:

```typescript
// apps/native/hooks/use-credits.ts — purchase()
const purchase = useCallback(async (packageId: string) => {
  setIsPurchasing(true);
  const previousBalance = balanceQuery.data?.balance ?? null;

  // Store purchase (never mutates balance)
  await nativePayments.purchaseCreditPackage({ packageId });

  setIsPurchasing(false);
  setIsSyncing(true);

  // Wait for webhook to grant credits
  const synced = await waitForBalanceSync(previousBalance);
  setIsSyncing(false);

  return { status: "purchased", synced };
}, ...);
```

The hook exposes `isPurchasing` (store transaction in progress) and `isSyncing` (waiting for server balance update) as separate flags for UI display.

## Section 6: Credit Consumption

To spend credits in a feature, use the `consume` mutation from the `useCredits()` hook:

```typescript
// Usage in a component
const { consume, balance } = useCredits();

// Consume credits with an idempotency key
await consume({
  amount: 10,
  idempotencyKey: `feature-use-${uniqueId}`,
  description: "Used feature X",
});
```

The server handles idempotency via the `idempotencyKey` to prevent double-spending.

## Section 7: Hook API Reference

The `useCredits()` hook from `apps/native/hooks/use-credits.ts` returns:

| Property | Type | Description |
|----------|------|-------------|
| `balance` | `object \| null` | Current credit balance from server |
| `packages` | `array` | Available credit packages for purchase |
| `isAvailable` | `boolean` | Whether credit system is ready (enabled + authenticated + payments ready) |
| `isLoading` | `boolean` | Initial data loading |
| `isPurchasing` | `boolean` | Store transaction in progress |
| `isSyncing` | `boolean` | Waiting for webhook to update balance |
| `error` | `Error \| null` | Last error (cancellation is not treated as error) |
| `consume` | `function` | Spend credits |
| `purchase` | `function` | Buy a credit package by ID |
| `refetchCredits` | `function` | Manually refresh balance |

## Common Mistakes

- **Trying to grant credits client-side** -- the code comment says it explicitly: "The backend RevenueCat webhook is the only source allowed to add account credits." The client purchase flow only completes the store transaction and polls for the server to catch up.
- **Missing credit products in RevenueCat** -- credit `providerProductId` values must be imported as products in RevenueCat. Unlike subscription products, they are fetched via `Purchases.getProducts()` with `NON_SUBSCRIPTION` category, not through offerings.
- **Wrong store product type** -- credit products must be created as **Consumable** in App Store Connect and as managed (one-time) products in Google Play. Using "non-consumable" or "auto-renewable subscription" breaks the purchase flow.
- **Credit product attached to an entitlement** -- credit purchases should NOT grant the `pro` entitlement. They are separate from the subscription/membership system. Do not attach credit products to any entitlement in RevenueCat.
- **`providerProductId` mismatch** -- the store product ID, the RevenueCat product import, and the `providerProductId` in `app-config.ts` must all be identical. The webhook handler uses `findNativeCreditPackageByProviderProductId()` to map incoming events.
- **Anonymous user during credit purchase** -- same as subscriptions: if identity sync has not completed, the webhook arrives with an anonymous user ID and credits are not granted. The `isPaymentsReady` flag gates purchase availability.
- **Refund handling** -- when a credit purchase is refunded (CANCELLATION event), the server revokes only the remaining unspent credits from the original purchase, not the full amount.

## Verification

1. `appConfig.creditsEnabled` is `true` and `useCredits().isAvailable` returns `true`
2. Credit packages appear in the credit purchase screen
3. Sandbox purchase completes and `isSyncing` transitions to `false`
4. Server logs show `NON_RENEWING_PURCHASE` webhook processed
5. Balance increases by the package `amount` after sync
6. `pnpm check-types` passes after any credit config changes
