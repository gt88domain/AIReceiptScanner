---
name: easystarter-mobile-revenuecat
description: Configure RevenueCat for EasyStarter Mobile payments. Use when someone says "set up RevenueCat", "configure in-app purchases", "native payments", "fix webhook", "paywall not showing", "purchases not working", "subscription not syncing", "RevenueCat dashboard setup", "add products to offerings", "entitlement not active", or "restore purchases broken".
---

# EasyStarter Mobile RevenueCat

RevenueCat is the purchase layer for native subscriptions, lifetime purchases, and credit package buys. The native app handles the store transaction, but the **server is the entitlement authority** -- the RevenueCat webhook updates billing records and grants credits server-side. The client never mutates entitlement state directly.

## Decision Tree

- **Initial RevenueCat setup** -> Read `references/revenuecat-setup-guide.md`
- **SDK not initializing / no offerings** -> Section 1 (SDK config) + Section 2 (env vars)
- **Purchases succeed but entitlement not reflected** -> Section 4 (webhook)
- **Add new products to offerings** -> Section 3 (dashboard mapping)
- **Paywall not appearing** -> Section 5 (paywall)
- **Credit purchases not granting credits** -> Section 4 (webhook NON_RENEWING_PURCHASE)
- **Anonymous user webhook errors** -> Section 6 (identity sync)

## Section 1: SDK Initialization

The `NativePaymentsSdk` singleton in `apps/native/lib/payments/revenuecat.ts` configures RevenueCat once per app lifecycle:

```typescript
// apps/native/lib/payments/revenuecat.ts — configure()
configure() {
  this.assertAvailable();
  const apiKey = this.config.apiKey as string;

  if (this.configuredApiKey === apiKey) {
    return true;
  }

  Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.INFO);
  Purchases.setProxyURL("https://api.rc-backup.com/");
  Purchases.configure({
    apiKey,
  });
  this.configuredApiKey = apiKey;
  return true;
}
```

Key points:
- `configure()` is idempotent -- calling it multiple times with the same key is safe
- The proxy URL (`https://api.rc-backup.com/`) is already set in the code for China/restricted regions
- The API key is selected per platform by `resolveApiKeyForPlatform()`:

```typescript
// apps/native/lib/payments/revenuecat.ts
function resolveApiKeyForPlatform() {
  switch (Platform.OS) {
    case "ios":
      return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
    case "android":
      return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
    default:
      return undefined;
  }
}
```

The auth provider calls `nativePayments.configure()` and `nativePayments.syncAppUser(userId)` during auth state changes, so the SDK is ready before any purchase flow.

## Section 2: Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | `apps/native/eas.json` env blocks | iOS public API key from RevenueCat dashboard (starts with `appl_`) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | `apps/native/eas.json` env blocks | Android public API key (starts with `goog_`) |
| `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` | `apps/native/eas.json` env blocks | Entitlement identifier checked for premium access (default: `"pro"`) |
| `REVENUECAT_WEBHOOK_SECRET` | `apps/server/.dev.vars` (dev) / Wrangler secrets (prod) | Server-side webhook verification token |

Current values in `eas.json`:

```json
{
  "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY": "appl_GutoexiMibsvBDxBTXJvcjYvRWR",
  "EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID": "pro"
}
```

## Section 3: RevenueCat Dashboard Mapping

The RevenueCat dashboard has four layers. Each must be configured:

**Products** -- imported from App Store Connect / Google Play. Each product ID must match a `providerPriceId` in `app-config.ts`:
- `easystarternative_10_1m` (iOS monthly)
- `easystarternative_100_1y` (iOS yearly)
- `easystarternative_299_lifetime` (iOS lifetime)
- `pro_monthly_android` (Android monthly)
- `pro_yearly_android` (Android yearly)
- Credit products: `easystarter_credits_starter_ios`, `easystarter_credits_growth_ios`, etc.

**Entitlements** -- create an entitlement named `pro` (matching `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`). Attach all subscription and lifetime products to it. Do NOT attach credit products.

**Offerings** -- create a default offering containing packages for each subscription/lifetime product. The SDK fetches the current offering to display pricing.

**Packages** -- inside each offering, add packages for each product. The package identifier can be anything, but the underlying product must match the store product ID.

## Section 4: Server Webhook

The server endpoint processes RevenueCat events at `{SERVER_URL}/api/webhooks/revenuecat`.

Configure in RevenueCat dashboard: Project Settings -> Webhooks -> Add new. Set the URL and paste `REVENUECAT_WEBHOOK_SECRET`.

The webhook handler in `apps/server/src/payments/providers/revenuecat/webhook/handle-event.ts` processes these event types:

| Event Type | Server Action |
|------------|---------------|
| `INITIAL_PURCHASE` | Creates/updates billing subscription or purchase record |
| `RENEWAL` | Updates subscription period end date |
| `CANCELLATION` | Sets `cancelAtPeriodEnd`, or refunds credit purchase |
| `EXPIRATION` | Marks subscription as canceled |
| `NON_RENEWING_PURCHASE` | Grants credits for credit package purchases |
| `PRODUCT_CHANGE` | Ignored (informational only, followed by INITIAL_PURCHASE) |

For credit purchases specifically:

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

The handler uses idempotency checks via `sourceProvider` + `sourceId` to prevent duplicate grants.

## Section 5: Paywall

The SDK provides built-in paywall UI via RevenueCatUI:

```typescript
// apps/native/lib/payments/revenuecat.ts — presentPaywall()
async presentPaywall(input: PresentPaywallInput = {}) {
  this.configure();
  const offering = await this.resolveOfferingForPaywall(offerings, input.offeringId);
  return RevenueCatUI.presentPaywall(
    offering ? { offering } : undefined,
  );
}

// presentPaywallIfNeeded() only shows if entitlement is NOT active
async presentPaywallIfNeeded(input: PresentPaywallIfNeededInput = {}) {
  const requiredEntitlementIdentifier = input.entitlementId ?? this.config.entitlementId;
  return RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier,
    ...(offering ? { offering } : {}),
  });
}
```

After a paywall purchase or restore, `shouldRefreshAfterPaywall()` returns true for `PURCHASED` and `RESTORED` results.

The `useNativePayments()` hook in `apps/native/hooks/use-native-payments.ts` wraps purchase operations with a 30-second local entitlement sync window where the client shows the local RevenueCat state while the server catches up via webhook.

## Section 6: Identity Sync

RevenueCat identity must be synced with the app's auth state. The auth provider handles this:

```typescript
// apps/native/lib/payments/revenuecat.ts — syncAppUser()
async syncAppUser(appUserId: string | null) {
  if (appUserId) {
    return this.logIn(appUserId);
  }
  return this.logOut();
}
```

When a user signs in, `syncAppUser(userId)` is called, which calls `Purchases.logIn(userId)`. When they sign out, `syncAppUser(null)` calls `Purchases.logOut()`.

The webhook handler rejects anonymous users:

```typescript
// apps/server/src/payments/providers/revenuecat/webhook/handle-event.ts
function isAnonymousRevenueCatUserId(value: string | null | undefined) {
  return !value || value.startsWith("$RCAnonymousID:");
}
```

If a purchase happens before `syncAppUser()` completes, the webhook arrives with an anonymous user ID and the server logs an error and skips it. The user gets charged but no entitlement is granted.

## Common Mistakes

- **Anonymous user webhook (no `app_user_id`)** -- if a purchase completes before identity sync, the webhook has only `$RCAnonymousID:...` and the server cannot map it to a user. Ensure `syncAppUser()` completes before any purchase flow.
- **Product not in offerings** -- the SDK can only fetch products that are added to at least one offering in the RevenueCat dashboard. A product that exists in App Store Connect but not in RevenueCat offerings will not be found by `Purchases.getOfferings()`.
- **Missing `REVENUECAT_WEBHOOK_SECRET` on server** -- without this secret, the server cannot verify webhook authenticity. Set it in `.dev.vars` for local dev and as a Wrangler secret for production.
- **Using offering ID as `providerPriceId` in app-config** -- `providerPriceId` must be the store product identifier (e.g., `easystarternative_10_1m`), not the RevenueCat offering identifier.
- **Credit products attached to entitlement** -- credit products are consumable and should NOT be attached to the `pro` entitlement. Only subscription and lifetime products grant entitlement access.
- **Webhook URL not updated after server deploy** -- if you redeploy to a new URL, update the webhook URL in RevenueCat dashboard.
- **Entitlement name mismatch** -- `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` must exactly match the entitlement identifier in the RevenueCat dashboard (case-sensitive).

## Verification

1. RevenueCat dashboard: all store products imported and visible
2. Entitlement `pro` exists with subscription/lifetime products attached
3. Default offering exists with packages for each product
4. Webhook URL points to `{SERVER_URL}/api/webhooks/revenuecat`
5. Sandbox purchase succeeds and entitlement activates
6. Server logs show webhook received and processed
7. `pnpm check-types` passes after any config changes
