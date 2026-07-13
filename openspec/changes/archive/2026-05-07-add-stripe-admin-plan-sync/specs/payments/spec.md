## ADDED Requirements
### Requirement: Admin plan creation syncs Stripe products
The system SHALL create a Stripe Product when an admin creates a plan with provider "stripe" and persist the Stripe product ID on the plan.

#### Scenario: Stripe plan creation succeeds
- **WHEN** an admin creates a plan with provider "stripe"
- **THEN** the system creates a Stripe Product and stores its ID on the plan

#### Scenario: Stripe plan creation fails
- **WHEN** Stripe product creation fails
- **THEN** the system SHALL not persist the plan and SHALL return an error

### Requirement: Admin price creation syncs Stripe prices
The system SHALL create a Stripe Price when an admin creates a Stripe price and persist the Stripe price ID on the billing price record.

#### Scenario: Stripe price creation succeeds
- **WHEN** an admin creates a Stripe price for a plan with a Stripe product ID
- **THEN** the system creates a Stripe Price and stores its ID on the price record

#### Scenario: Plan not synced to Stripe
- **WHEN** an admin creates a Stripe price for a plan without a Stripe product ID
- **THEN** the system SHALL reject the request with an error

#### Scenario: Stripe price creation fails
- **WHEN** Stripe price creation fails
- **THEN** the system SHALL not persist the price and SHALL return an error
