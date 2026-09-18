## ADDED Requirements
### Requirement: Unified storage config source
The system SHALL load storage provider defaults, upload type rules, size limits, and storage path prefixes from a single shared app configuration source.

#### Scenario: Storage constants are sourced from unified config
- **WHEN** storage helpers resolve allowed MIME types, size limits, public path, or key prefixes
- **THEN** values come from the unified `@repo/app-config` source
- **AND** no duplicated hardcoded storage literals are required in storage config package internals
