## ADDED Requirements
### Requirement: Unified payments plan config source
The system SHALL load the server-side payments plan catalog from a shared app configuration source instead of duplicating plan literals in payments package internals.

#### Scenario: Payments plan catalog resolves from unified config
- **WHEN** the payments plan catalog is initialized
- **THEN** plan definitions are read from `@repo/app-config`
- **AND** downstream normalization and entitlement logic continue to consume the same typed payments config shape
