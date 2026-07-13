## MODIFIED Requirements
### Requirement: oRPC File Upload

The system SHALL provide a type-safe file upload capability via oRPC that supports `File` and `Blob` objects natively.

#### Scenario: Successful avatar upload
- **GIVEN** an authenticated user
- **WHEN** the user calls `storage.upload` with a valid image file and purpose "avatar"
- **THEN** the file is stored in the configured storage provider (default R2) with key format `avatars/{userId}/{timestamp}.{ext}`
- **AND** the response includes `url`, `key`, `size`, and `contentType`

#### Scenario: Successful attachment upload
- **GIVEN** an authenticated user
- **WHEN** the user calls `storage.upload` with a valid file and purpose "attachment"
- **THEN** the file is stored in the configured storage provider (default R2) with key format `attachments/{userId}/{timestamp}.{ext}`
- **AND** the response includes `url`, `key`, `size`, and `contentType`

#### Scenario: Invalid file type rejected
- **GIVEN** an authenticated user
- **WHEN** the user calls `storage.upload` with a file type not allowed for the purpose
- **THEN** the request fails with a validation error indicating invalid file type

#### Scenario: File too large rejected
- **GIVEN** an authenticated user
- **WHEN** the user calls `storage.upload` with a file exceeding the size limit for the purpose
- **THEN** the request fails with a validation error indicating file too large

#### Scenario: Unauthenticated upload rejected
- **GIVEN** an unauthenticated user
- **WHEN** the user calls `storage.upload`
- **THEN** the request fails with UNAUTHORIZED error

## ADDED Requirements
### Requirement: Storage Provider Selection

The system SHALL select a storage provider based on server configuration, defaulting to the R2 provider when not specified.

#### Scenario: Default provider selection
- **GIVEN** no explicit storage provider configuration
- **WHEN** storage provider is requested
- **THEN** the system selects the R2 provider

#### Scenario: Unknown provider key rejected
- **GIVEN** a storage provider configuration with an unknown key
- **WHEN** storage provider is requested
- **THEN** the system fails with a configuration error indicating the provider is not registered
