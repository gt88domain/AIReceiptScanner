## ADDED Requirements

### Requirement: Web billing supports Creem as a second provider
The system SHALL allow web payment plans and server billing APIs to use Creem in addition to Stripe.

#### Scenario: Creem plan is exposed in normalized plan catalog
- **WHEN** a web plan price is configured with `provider: "creem"`
- **THEN** the normalized plan catalog includes that price
- **AND** the price keeps its provider-specific identifier in `providerPriceId`

#### Scenario: Web checkout accepts Creem plan selection
- **WHEN** a user starts checkout for a Creem-backed web price
- **THEN** the checkout service routes the request to the Creem provider
- **AND** the provider maps the first checkout line item `priceId` to Creem `product_id`

### Requirement: Creem subscriptions participate in managed billing flows
The system SHALL allow Creem subscriptions to use the existing portal and same-provider upgrade flows.

#### Scenario: Creem subscription can open billing portal
- **WHEN** the current active billing provider is `creem`
- **THEN** billing status returns `canManageBilling = true`
- **AND** web billing UI can request a provider portal session

#### Scenario: Creem subscription can upgrade within the same provider
- **WHEN** a user with an active Creem subscription selects a higher-tier Creem subscription price
- **THEN** the billing service performs an in-provider upgrade instead of starting a new checkout

### Requirement: Creem webhook events update internal billing state
The system SHALL verify Creem webhooks and map them into the existing billing tables.

#### Scenario: Creem webhook signature is valid
- **WHEN** the server receives a Creem webhook with a valid HMAC-SHA256 signature for the raw body
- **THEN** the event is accepted and persisted once by provider event ID

#### Scenario: Scheduled cancel keeps access until period end
- **WHEN** Creem reports a subscription in `scheduled_cancel`
- **THEN** the stored subscription remains `active`
- **AND** `cancelAtPeriodEnd` is set to `true`

#### Scenario: Paused subscription loses active entitlement
- **WHEN** Creem reports a subscription in `paused`
- **THEN** the stored subscription status is `paused`
- **AND** entitlement resolution does not treat it as active

#### Scenario: One-time purchase refund revokes purchase record
- **WHEN** Creem emits a refund event for a one-time purchase transaction
- **THEN** the matching internal purchase record is updated to `refunded`
