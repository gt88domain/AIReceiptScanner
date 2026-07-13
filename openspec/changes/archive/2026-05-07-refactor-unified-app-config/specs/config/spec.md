## ADDED Requirements
### Requirement: Single typed app config source
The system SHALL provide a single typed cross-platform app configuration package for non-secret business configuration.

#### Scenario: Shared app config access
- **WHEN** server, web, or domain packages need app-level business configuration
- **THEN** they import from `@repo/app-config`
- **AND** configuration shape is validated through TypeScript types

### Requirement: Runtime URL composition helpers
The system SHALL provide runtime builder helpers to combine static app config with runtime URL context.

#### Scenario: Server runtime config generation
- **WHEN** server config is built with a runtime `serverUrl`
- **THEN** auth redirect URIs and sender metadata are composed from unified app config and runtime input

#### Scenario: Web localized URL generation
- **WHEN** web callback URLs are built with `appUrl`, `locale`, and `defaultLocale`
- **THEN** auth and billing URLs are generated with locale-aware prefixes based on unified route paths
