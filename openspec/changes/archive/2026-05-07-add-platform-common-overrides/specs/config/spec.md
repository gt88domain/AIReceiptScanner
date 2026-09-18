## ADDED Requirements

### Requirement: Platform config SHALL support overriding shared common values
The configuration model SHALL allow `web` and `native` sections to define optional direct common fields for overriding `AppCommonConfig` values.

#### Scenario: Define web-specific app name override
- **WHEN** `appConfig.web.app.name` is provided
- **THEN** web merged common config uses the override value
- **AND** the base `appConfig.common.app.name` remains unchanged

### Requirement: The system SHALL provide merged common resolvers per platform
The package SHALL expose resolver functions for merged common values:
- `resolveWebCommonConfig()`
- `resolveNativeCommonConfig()`

#### Scenario: Native reads shared values without direct common fields
- **WHEN** `appConfig.native` does not define common override fields
- **THEN** `resolveNativeCommonConfig()` returns the same values as `resolveCommonConfig()`

#### Scenario: Nested override merge
- **WHEN** `appConfig.web.auth.socialProviders.github.callbackPath` is provided
- **THEN** merged web common config updates only that nested path
- **AND** sibling auth provider paths remain from base common config
