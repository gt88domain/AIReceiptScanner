# Change: Add native RevenueCat wrapper

## Why
The native app already includes RevenueCat SDK dependencies, but it has no shared client-side integration layer. Future billing work still needs a single place to configure the SDK, resolve offerings, purchase packages, and present paywalls, but the original provider-based design was heavier than needed for this codebase.

## What Changes
- Add a single typed native payments wrapper around `react-native-purchases` and `react-native-purchases-ui`.
- Keep RevenueCat configuration, identity methods, offerings lookup, purchase, restore, and paywall presentation inside one module under `apps/native/features/payments`.
- Add Expo public environment variable conventions for platform SDK keys and the default entitlement identifier.
- Support platform-specific native payment catalogs so iOS and Android can use different RevenueCat product identifiers and pricing metadata.

## Impact
- Affected specs: `payments`
- Affected code:
  - `apps/native/features/payments/index.ts`
  - `apps/native/.env*.example`
  - `apps/native/README.md`
