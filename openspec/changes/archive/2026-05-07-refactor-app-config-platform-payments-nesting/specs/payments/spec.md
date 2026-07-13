## ADDED Requirements

### Requirement: Payments config MUST be nested under platform sections
The app configuration SHALL define payments configuration under platform-scoped paths and SHALL NOT use a top-level `payments` object.

#### Scenario: Reading web payments configuration
- **WHEN** server or web modules load payments provider and plans
- **THEN** they read from `appConfig.web.payments`
- **AND** they do not depend on `appConfig.payments.web`

#### Scenario: Reading native payments configuration
- **WHEN** native payments modules load provider and plans
- **THEN** they read from `appConfig.native.payments`
- **AND** they do not depend on `appConfig.payments.native`

### Requirement: Optional platform payments config MUST have deterministic defaults
The system SHALL provide defaults when optional platform payments sections are omitted.

#### Scenario: Missing web payments config
- **WHEN** `appConfig.web.payments` is undefined
- **THEN** web payments provider defaults to `stripe`
- **AND** web plans default to an empty list

#### Scenario: Missing native payments config
- **WHEN** `appConfig.native.payments` is undefined
- **THEN** native payments provider defaults to `revenuecat`
- **AND** native plans default to an empty list

### Requirement: Legacy top-level payments path MUST fail type usage
The TypeScript app config type SHALL reject direct usage of `appConfig.payments`.

#### Scenario: Legacy code accesses removed top-level payments
- **WHEN** code tries to read `appConfig.payments`
- **THEN** TypeScript reports a property access error
- **AND** developers must migrate to platform-nested paths
