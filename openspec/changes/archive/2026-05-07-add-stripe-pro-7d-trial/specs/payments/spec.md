## ADDED Requirements

### Requirement: Stripe subscription prices support configurable trial days
The system SHALL allow a web subscription price to define `trialDays` as a positive integer and expose it in normalized pricing output.

#### Scenario: Valid subscription trial days
- **WHEN** a Stripe subscription price is configured with `trialDays: 7`
- **THEN** the normalized plan catalog includes `trialDays: 7` for that price

#### Scenario: Invalid trial days type
- **WHEN** a price is configured with a non-integer or non-positive `trialDays`
- **THEN** payments config normalization SHALL fail with a validation error

#### Scenario: Non-subscription price configures trial days
- **WHEN** a lifetime price is configured with `trialDays`
- **THEN** payments config normalization SHALL fail with a validation error

### Requirement: Trial is applied only for first eligible Stripe subscription checkout
The system SHALL set Stripe `trial_period_days` only for subscription checkout sessions when the target price has `trialDays` and the user has no qualifying historical Stripe subscription.

#### Scenario: First subscription checkout receives trial
- **WHEN** a user starts Stripe checkout for Pro monthly/yearly and has no historical Stripe subscription in `trialing/active/past_due/unpaid/canceled`
- **THEN** checkout session creation sends `subscription_data.trial_period_days` with configured `trialDays`

#### Scenario: Historical subscription blocks trial
- **WHEN** a user has historical Stripe subscription status in `trialing/active/past_due/unpaid/canceled`
- **THEN** checkout session creation SHALL NOT send `subscription_data.trial_period_days`

#### Scenario: Incomplete-only history does not block trial
- **WHEN** a user only has `incomplete` historical subscriptions
- **THEN** checkout session creation still sends configured `trialDays`

### Requirement: Pricing UI surfaces trial messaging for trial-enabled subscription prices
The pricing UI SHALL display trial messaging for subscription prices that include `trialDays`.

#### Scenario: Trial-enabled Pro pricing card
- **WHEN** Pro monthly/yearly price metadata includes `trialDays`
- **THEN** pricing card shows localized trial text indicating trial days and new-user eligibility
