## ADDED Requirements

### Requirement: Web payments config MUST be exposed through a dedicated subpath
The `@repo/app-config` package SHALL expose web payment configuration and policy utilities through `@repo/app-config/payments/web`.

#### Scenario: Server and web modules import web payments helpers
- **WHEN** a module imports payment plans, policy helpers, or subscription status constants
- **THEN** it imports from `@repo/app-config/payments/web`
- **AND** those imports resolve to the same runtime behavior as before the split

### Requirement: Native payments config MUST be exposed through a dedicated subpath
The `@repo/app-config` package SHALL expose native payment provider and native plan normalization utilities through `@repo/app-config/payments/native`.

#### Scenario: Native module defines and validates native plans
- **WHEN** native billing configuration is read from app config
- **THEN** `@repo/app-config/payments/native` provides typed config definitions and normalization helpers
- **AND** invalid native plan data is rejected with deterministic validation errors

### Requirement: Root payments subpath MUST NOT be exported
The package SHALL NOT export a root payments subpath at `@repo/app-config/payments`.

#### Scenario: Legacy root import is used
- **WHEN** code attempts to import from `@repo/app-config/payments`
- **THEN** TypeScript module resolution fails
- **AND** developers must migrate to `@repo/app-config/payments/web` or `@repo/app-config/payments/native`
