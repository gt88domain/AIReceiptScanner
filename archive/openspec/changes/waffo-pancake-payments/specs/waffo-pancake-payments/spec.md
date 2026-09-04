## ADDED Requirements

### Requirement: Waffo SHALL be available as a web payment provider

The system SHALL allow Waffo Pancake to be configured as a web/server payment provider while keeping existing Stripe, Creem, and RevenueCat provider behavior unchanged.

#### Scenario: Waffo price appears in the web catalog

- **WHEN** a web payment plan price is configured with provider `waffo` and a Waffo Product ID for the active provider price environment
- **THEN** the normalized payment catalog includes that price with provider `waffo`
- **AND** the price remains subject to the existing plan, price, and membership catalog validation rules

#### Scenario: Non-Waffo providers remain supported

- **WHEN** the web payment catalog contains existing Stripe or Creem prices
- **THEN** those prices continue to normalize and route through their existing provider implementations

### Requirement: Waffo checkout SHALL use server-side SDK sessions

The system SHALL create Waffo checkout sessions through server-side `@waffo/pancake-ts` calls and return the hosted checkout URL through the existing checkout API.

#### Scenario: Subscription checkout session is created

- **WHEN** an authenticated web user starts checkout for an active subscription price whose provider is `waffo`
- **THEN** the server creates a Waffo checkout session using the configured Waffo subscription Product ID
- **AND** the server stores a local billing checkout session using provider `waffo`
- **AND** the client receives a checkout URL

#### Scenario: Lifetime checkout session is created

- **WHEN** an authenticated web user starts checkout for an active lifetime price whose provider is `waffo`
- **THEN** the server creates a Waffo checkout session using the configured Waffo one-time Product ID
- **AND** the server stores a local billing checkout session using provider `waffo`
- **AND** the client receives a checkout URL

#### Scenario: Checkout metadata links webhook fulfillment

- **WHEN** the server creates a Waffo checkout session
- **THEN** the checkout request includes metadata containing the internal user ID, plan ID, price ID, and provider key
- **AND** webhook processing can use the metadata or stored checkout session to resolve the billing owner

### Requirement: Waffo webhooks SHALL verify raw signed payloads

The system SHALL expose a Waffo webhook endpoint that verifies the Waffo signature against the raw request body before processing events.

#### Scenario: Valid Waffo webhook is accepted

- **WHEN** Waffo sends a webhook with a valid `x-waffo-signature` header and raw body
- **THEN** the server verifies the payload through the Waffo SDK
- **AND** the webhook is passed to the payment service with provider `waffo`
- **AND** the server responds with a successful receipt after processing

#### Scenario: Invalid Waffo webhook is rejected

- **WHEN** Waffo sends a webhook with a missing or invalid signature
- **THEN** the server rejects the webhook without mutating billing state

#### Scenario: Duplicate Waffo webhook is ignored

- **WHEN** Waffo retries a webhook event whose provider event ID was already processed
- **THEN** the server treats the delivery as duplicate
- **AND** the billing state is not applied a second time

### Requirement: Waffo webhook fulfillment SHALL update existing billing state

The system SHALL map supported Waffo payment, subscription, and refund events into existing EasyStarter billing records.

#### Scenario: Completed one-time order grants lifetime access

- **WHEN** a verified Waffo `order.completed` event is received for a lifetime price
- **THEN** the server records or updates a succeeded billing purchase for the owning user
- **AND** the current entitlement can resolve lifetime access from the existing billing status API

#### Scenario: Activated subscription grants subscription access

- **WHEN** a verified Waffo `subscription.activated` or `subscription.payment_succeeded` event is received
- **THEN** the server records or updates the billing customer and billing subscription for the owning user
- **AND** the current entitlement can resolve subscription access from the existing billing status API

#### Scenario: Canceling subscription preserves access until period end

- **WHEN** a verified Waffo `subscription.canceling` event is received
- **THEN** the server marks the matching local subscription as canceling at period end
- **AND** active access remains available while the subscription status is still active

#### Scenario: Canceled or past-due subscription removes active subscription access

- **WHEN** a verified Waffo `subscription.canceled` or `subscription.past_due` event is received
- **THEN** the server updates the matching local subscription status so it no longer grants active subscription access

#### Scenario: Refund removes fulfilled one-time value

- **WHEN** a verified Waffo `refund.succeeded` event is received for a one-time purchase
- **THEN** the server marks the matching local purchase as refunded when it can identify the original payment
- **AND** related credit package fulfillment is revoked when the purchase was a credit order

### Requirement: Waffo hosted consumer portal SHALL be available

The system SHALL return Waffo's hosted consumer portal login URL for Waffo-managed billing.

#### Scenario: Customer portal returns hosted Waffo URL

- **WHEN** a user requests a customer portal session for a Waffo-managed subscription
- **THEN** the server returns `https://pancake.waffo.ai/consumer/portal/login`

### Requirement: Waffo unsupported management actions SHALL fail explicitly

The system SHALL not silently emulate Waffo management operations that are not confirmed to be supported by Waffo APIs.

#### Scenario: Subscription cancel-at-period-end is supported

- **WHEN** the system requests `cancelAtPeriodEnd: true` for a Waffo-managed subscription
- **THEN** the server calls the Waffo subscription cancellation API with the provider subscription order ID
- **AND** the local subscription state is updated by subsequent Waffo webhook events

#### Scenario: Subscription cancel reactivation is unavailable

- **WHEN** the system requests `cancelAtPeriodEnd: false` for a Waffo-managed subscription
- **THEN** the server returns a clear provider capability error
- **AND** the local subscription is not mutated optimistically

#### Scenario: Direct subscription upgrade is unavailable

- **WHEN** a user attempts direct in-app subscription upgrade for a Waffo-managed subscription before a supported plan-change mapping exists
- **THEN** the server returns a clear provider capability error
- **AND** the local subscription is not mutated optimistically

### Requirement: Waffo secrets SHALL remain server-only

The system SHALL keep Waffo merchant credentials and private keys out of browser code and committed source files.

#### Scenario: Server initializes Waffo with environment credentials

- **WHEN** the Waffo provider is first used on the server
- **THEN** it reads the Merchant ID and private key from server runtime environment variables
- **AND** it fails fast with a clear configuration error if required credentials are missing

#### Scenario: Browser code cannot access Waffo private key

- **WHEN** the web app initiates checkout
- **THEN** browser code calls the existing server checkout mutation
- **AND** no Waffo private key or signing material is included in client bundles or API responses
