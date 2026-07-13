## ADDED Requirements

### Requirement: Payments semantics SHALL provide a shared entitlement model
The system SHALL expose a shared payments semantics module that defines the normalized membership entitlement model used across web and native surfaces.

#### Scenario: Shared code resolves membership tier
- **WHEN** application code needs to determine the current membership tier from a price
- **THEN** it uses one shared helper for `monthly`, `yearly`, and `lifetime`
- **AND** both web and native code can depend on the same entitlement types

#### Scenario: Shared code resolves checkout action
- **WHEN** web or native code needs to decide whether a target purchase is a checkout, upgrade, or denial
- **THEN** both clients use one shared decision helper
- **AND** the resulting action semantics stay aligned across platforms

### Requirement: Native payments SHALL expose normalized entitlement state
The native payments state SHALL expose a normalized entitlement model in addition to raw RevenueCat data.

#### Scenario: Native screen reads current entitlement
- **WHEN** a native screen consumes payments state
- **THEN** it can read `currentEntitlement`, `activePlan`, `activePrice`, `hasLifetime`, and `hasActiveSubscription`
- **AND** `isSubscribed` remains available as a compatibility field derived from the normalized entitlement

#### Scenario: Native active purchases map to different entitlement ranks
- **WHEN** native RevenueCat state maps to multiple configured active prices
- **THEN** native entitlement resolution selects the highest-ranked entitlement deterministically
- **AND** lifetime wins over yearly, and yearly wins over monthly

### Requirement: Native premium pricing presentation SHALL come from shared payments semantics
The native premium screen SHALL derive pricing presentation metadata from the shared payments semantics module instead of page-local constants.

#### Scenario: Native premium screen renders subscription and lifetime plans
- **WHEN** the premium screen builds plan options for active native prices
- **THEN** the title, billing note, suffix, and badge come from shared payment presentation metadata
- **AND** the screen does not define local month/year presentation constants

### Requirement: Native platform plans SHALL align with web payment semantics
The native platform payment catalogs SHALL use the same semantic plan and price definitions as the web payment catalog.

#### Scenario: Native plan matches a web-defined price
- **WHEN** native payment config declares a `{ planId, priceId }`
- **THEN** the same semantic price exists in `web.payments.plans`
- **AND** `priceType`, `interval`, and `status` match the web definition

#### Scenario: Native platform omits an otherwise valid price
- **WHEN** a native platform does not include a web-defined price
- **THEN** that price is unavailable only on that platform
- **AND** config normalization still succeeds

### Requirement: RevenueCat purchases SHALL participate in the unified billing model
The server SHALL ingest RevenueCat webhook events and persist native purchases into the billing model used by the billing status API.

#### Scenario: Native subscription purchase completes
- **WHEN** RevenueCat sends a subscription lifecycle event for a mapped native product
- **THEN** the server stores or updates a billing subscription row for provider `revenuecat`
- **AND** the unified billing status reflects the updated entitlement

#### Scenario: Native lifetime purchase completes
- **WHEN** RevenueCat sends a non-renewing purchase event for a mapped lifetime product
- **THEN** the server stores or updates a billing purchase row for provider `revenuecat`
- **AND** the unified billing status reflects lifetime entitlement

### Requirement: Native payments SHALL use server-first membership state
The native app SHALL prefer the server billing status as the final membership state while still allowing local RevenueCat state for immediate post-purchase feedback.

#### Scenario: Local purchase succeeds before server sync completes
- **WHEN** the native app observes a paid local RevenueCat state but the server billing status has not yet caught up
- **THEN** the app shows a syncing state
- **AND** it keeps local entitlement as a temporary fallback until the server result arrives

#### Scenario: Server billing status becomes available
- **WHEN** the server returns a billing status for the signed-in user
- **THEN** native membership state uses the server entitlement as the effective result
- **AND** local RevenueCat state remains only for transitional fallback

### Requirement: Web pricing SHALL use shared presentation semantics
The web pricing UI SHALL derive suffix and badge semantics from the shared payments presentation helpers.

#### Scenario: Web pricing renders a yearly plan
- **WHEN** the web pricing UI renders a yearly subscription option
- **THEN** it derives the badge semantic from the shared presentation helper
- **AND** the badge copy matches the native yearly badge copy
