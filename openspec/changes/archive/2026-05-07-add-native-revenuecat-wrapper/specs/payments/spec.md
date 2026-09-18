## ADDED Requirements

### Requirement: Native app SHALL provide a shared RevenueCat client wrapper
The native app SHALL expose a single client-side payments wrapper that initializes `react-native-purchases` once and provides direct methods for RevenueCat state and actions.

#### Scenario: Native payments are enabled and configured
- **WHEN** the native app starts on iOS or Android with RevenueCat enabled and a platform SDK key configured
- **THEN** app code can initialize RevenueCat through one shared wrapper module
- **AND** business code does not need to call RevenueCat SDK APIs directly

#### Scenario: Native payments are disabled or unavailable
- **WHEN** native payments are disabled in app config, the platform is unsupported, or the platform SDK key is missing
- **THEN** the wrapper reports a disabled or unavailable state
- **AND** the app does not crash during startup

### Requirement: Native payments identity SHALL follow Better Auth login state
The wrapper SHALL support explicit RevenueCat identity synchronization for Better Auth-driven login state.

#### Scenario: Authenticated user becomes available
- **WHEN** app code resolves a signed-in Better Auth user
- **THEN** it can call the wrapper with `user.id`
- **AND** the wrapper logs RevenueCat into that app user ID

#### Scenario: Authenticated user signs out
- **WHEN** app code needs to clear a RevenueCat identity
- **THEN** it can call the wrapper logout method
- **AND** RevenueCat returns to anonymous state

### Requirement: Native payments wrapper SHALL expose subscription state and offering lookups
The wrapper SHALL surface `CustomerInfo`, offerings, active entitlement state, and configured plan/price package lookup helpers. Native payments config MAY declare separate iOS and Android catalogs.

#### Scenario: Screen needs active entitlement status
- **WHEN** client code loads customer info through the wrapper
- **THEN** it can ask the wrapper whether the default or explicit entitlement is active
- **AND** it can derive active entitlement identifiers and active configured plan/price matches

#### Scenario: Screen needs a package for a configured price
- **WHEN** client code requests a package by `{ planId, priceId }`
- **THEN** the wrapper resolves the configured RevenueCat product identifier from the current platform catalog
- **AND** it returns the matching package from the current or requested offering when available

#### Scenario: Current platform catalog omits a plan or price
- **WHEN** the active platform catalog does not contain a requested native plan or price
- **THEN** only that requested price is unavailable for purchase
- **AND** other configured prices in the same platform catalog remain usable

### Requirement: Native payments wrapper SHALL support manual purchase and restore flows
The wrapper SHALL provide manual purchase and restore actions for business-driven billing flows.

#### Scenario: Purchase a configured native plan price
- **WHEN** client code calls `purchasePlanPrice({ planId, priceId })`
- **THEN** the wrapper purchases the matching RevenueCat package
- **AND** it returns the purchase result and matched package to the caller

#### Scenario: Purchase is requested for a price unavailable on the current platform
- **WHEN** client code calls `purchasePlanPrice({ planId, priceId })` for a price that is not present in the active platform catalog
- **THEN** the wrapper throws a clear platform-specific configuration error

#### Scenario: Restore purchases
- **WHEN** client code calls `restorePurchases()`
- **THEN** the wrapper invokes RevenueCat restore
- **AND** it refreshes local subscription state afterward

### Requirement: Native payments wrapper SHALL support RevenueCatUI paywall helpers
The wrapper SHALL expose helper methods for paywall presentation through `react-native-purchases-ui`.

#### Scenario: Present a paywall explicitly
- **WHEN** client code calls `presentPaywall()`
- **THEN** the wrapper presents the current or requested offering paywall
- **AND** it returns the RevenueCat paywall result to the caller

#### Scenario: Present a paywall only if needed
- **WHEN** client code calls `presentPaywallIfNeeded()` without an explicit entitlement identifier
- **THEN** the wrapper uses `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` as the default entitlement identifier
- **AND** RevenueCat decides whether the paywall should be presented based on that entitlement
