# Native RevenueCat Payments Configuration Guide

## Overview

This project uses a two-layer configuration model for native in-app purchases:

- **RevenueCat** defines the real billing objects and store mappings
- **`appConfig.native.payments`** defines the app's business-facing catalog for each native platform

The key rule is:

- business code keeps using stable `planId` and `priceId`
- platform differences live in the platform catalog

This means iOS and Android can have different product ids, prices, and even different plan availability, while the purchase API stays the same.

## Recommended Structure

Use the following naming model consistently:

- **Entitlement**: `pro`
- **Plan IDs**:
  - `pro`
  - `lifetime`
- **Price IDs**:
  - `monthly`
  - `yearly`
  - `lifetime`
- **Offering**: `default`

This keeps the business model easy to understand:

- `pro` is the subscription feature tier
- `monthly` and `yearly` are subscription prices for `pro`
- `lifetime` is a separate one-time purchase plan

## RevenueCat Responsibilities

RevenueCat should contain the billing-specific objects:

1. **Entitlement**
   - `pro`

2. **Offerings**
   - `default`

3. **Packages**
   - monthly package
   - annual package
   - lifetime package

4. **Store products**
   - iOS products:
     - `pro_monthly_ios`
     - `pro_yearly_ios`
     - `lifetime_ios`
   - Android products:
     - `pro_monthly_android`
     - `pro_yearly_android`

5. **Entitlement mapping**
   - Every paid product that unlocks Pro should grant the `pro` entitlement

RevenueCat is the source of truth for:

- which store product exists
- which package or offering exposes it
- which entitlement it unlocks

## App Config Responsibilities

`appConfig.native.payments` is the source of truth for the app's current-platform business catalog.

Recommended example:

```ts
native: {
	routes: {
		authSignIn: "/callback",
	},
	payments: {
		enabled: true,
		provider: "revenuecat",
		ios: {
			plans: [
				{
					id: "pro",
					prices: [
						{
							id: "monthly",
							provider: "revenuecat",
							providerPriceId: "pro_monthly_ios",
							currency: "usd",
							amountCents: 1000,
							priceType: "subscription",
							interval: "month",
							status: "active",
						},
						{
							id: "yearly",
							provider: "revenuecat",
							providerPriceId: "pro_yearly_ios",
							currency: "usd",
							amountCents: 10000,
							priceType: "subscription",
							interval: "year",
							status: "active",
						},
					],
				},
				{
					id: "lifetime",
					prices: [
						{
							id: "lifetime",
							provider: "revenuecat",
							providerPriceId: "lifetime_ios",
							currency: "usd",
							amountCents: 200000,
							priceType: "lifetime",
							status: "active",
						},
					],
				},
			],
		},
		android: {
			plans: [
				{
					id: "pro",
					prices: [
						{
							id: "monthly",
							provider: "revenuecat",
							providerPriceId: "pro_monthly_android",
							currency: "usd",
							amountCents: 800,
							priceType: "subscription",
							interval: "month",
							status: "active",
						},
						{
							id: "yearly",
							provider: "revenuecat",
							providerPriceId: "pro_yearly_android",
							currency: "usd",
							amountCents: 8000,
							priceType: "subscription",
							interval: "year",
							status: "active",
						},
					],
				},
			],
		},
	},
}
```

## Why Platform Catalogs

Use platform catalogs when:

- iOS and Android prices are different
- product ids are different
- one platform has extra or missing plans

This is better than putting platform fields inside each price because all price metadata can stay truthful:

- `providerPriceId`
- `amountCents`
- `currency`
- `priceType`
- `interval`
- `status`

Each price object now describes one real purchasable item on one platform.

## Runtime Behavior

The native payments wrapper keeps the same business APIs:

- `purchasePlanPrice({ planId, priceId })`
- `getPackageByPlanPrice({ planId, priceId, offerings })`
- `getActivePlanPriceIds(customerInfo)`

At runtime, the wrapper:

1. reads `Platform.OS`
2. selects `payments.ios` or `payments.android`
3. normalizes only that platform catalog
4. resolves `providerPriceId` for the current platform
5. matches the RevenueCat package from `availablePackages`

There is no cross-platform fallback.

## Asymmetric Platform Catalogs

Platform catalogs are allowed to be asymmetric.

Examples:

- iOS has `pro.monthly`, `pro.yearly`, and `lifetime.lifetime`
- Android has only `pro.monthly` and `pro.yearly`

Behavior:

- the current platform only reads its own catalog
- missing plans or prices on the current platform are simply unavailable on that platform
- other plans on the same platform continue to work
- the wrapper does not read the other platform's catalog

Important distinction:

- **entitlement state** comes from RevenueCat
- **plan and price mapping** comes from the current platform catalog

This means a user can still have an active entitlement even if the current platform cannot map that purchase back to a local `planId` and `priceId`.

## Environment Variables

The wrapper depends on these public native env vars:

```env
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_revenuecat_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_revenuecat_android_key
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
```

Use `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` as the default entitlement for `presentPaywallIfNeeded()`.

## Recommended Setup Flow

1. Create App Store and Play Store products.
2. Add those products to RevenueCat.
3. Create the `pro` entitlement.
4. Create the `default` offering.
5. Attach monthly, yearly, and lifetime packages as needed per platform.
6. Map every paid product that unlocks Pro to the `pro` entitlement.
7. Mirror those product ids into `payments.ios` and `payments.android`.
8. Set the RevenueCat public SDK keys in native env files.
9. Rebuild the native app after changing env values or native purchase configuration.

## What Should Not Go in App Config

Do **not** use RevenueCat-only concepts as business ids:

- package ids such as `$rc_monthly`
- offering ids such as `default`
- entitlement ids as `planId`

Keep app config focused on business semantics:

- `planId`: feature tier
- `priceId`: billing variant
- `providerPriceId`: current platform store product id

## Common Mistakes

- Treating iOS and Android as one shared price catalog when their prices differ
- Using RevenueCat package ids where a store product id is required
- Assuming both platforms must expose the same plans and prices
- Hardcoding product ids in screen code instead of config
- Forgetting to rebuild after changing native env values

## Recommended Defaults

For most apps, start with:

- one entitlement: `pro`
- iOS catalog:
  - `pro.monthly`
  - `pro.yearly`
  - `lifetime.lifetime`
- Android catalog:
  - `pro.monthly`
  - `pro.yearly`

Then expand each platform independently when pricing or availability changes.
