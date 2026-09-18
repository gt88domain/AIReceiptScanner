## MODIFIED Requirements
### Requirement: oRPC File Upload

The system SHALL provide a type-safe file upload capability via oRPC that supports `File` and `Blob` objects natively and MAY target a supported storage provider per upload request.

#### Scenario: Successful avatar upload using default provider
- **GIVEN** an authenticated user
- **WHEN** the user calls `storage.upload` with a valid image file and purpose "avatar"
- **THEN** the file is stored in the configured default storage provider with key format `avatars/{userId}/{timestamp}.{ext}`
- **AND** the response includes `url`, `key`, `size`, `contentType`, and `provider`

#### Scenario: Successful attachment upload using default provider
- **GIVEN** an authenticated user
- **WHEN** the user calls `storage.upload` with a valid file and purpose "attachment"
- **THEN** the file is stored in the configured default storage provider with key format `attachments/{userId}/{timestamp}.{ext}`
- **AND** the response includes `url`, `key`, `size`, `contentType`, and `provider`

#### Scenario: Successful upload using explicit provider
- **GIVEN** an authenticated user
- **AND** the requested storage provider is supported and configured
- **WHEN** the user calls `storage.upload` with a valid file, purpose "attachment", and provider "aliyun-oss"
- **THEN** the file is stored in Aliyun OSS with key format `attachments/{userId}/{timestamp}.{ext}`
- **AND** the response provider is "aliyun-oss"
- **AND** the response URL includes the provider segment

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

### Requirement: Upload Input Validation

The system SHALL validate upload inputs using Zod schemas with the following constraints:

- `file`: Must be a `File` instance
- `purpose`: Must be one of `"avatar"` or `"attachment"`
- `provider`: When provided, must be one of the supported storage provider keys

#### Scenario: Missing file rejected
- **WHEN** `storage.upload` is called without a file
- **THEN** the request fails with a Zod validation error

#### Scenario: Invalid purpose rejected
- **WHEN** `storage.upload` is called with an invalid purpose value
- **THEN** the request fails with a Zod validation error

#### Scenario: Invalid provider rejected
- **WHEN** `storage.upload` is called with an invalid provider value
- **THEN** the request fails with a Zod validation error

### Requirement: Upload Response Type

The system SHALL return a typed response from `storage.upload` containing:

- `url`: string - The provider-scoped URL path to access the uploaded file
- `key`: string - The storage key for the file
- `size`: number - File size in bytes
- `contentType`: string - MIME type of the uploaded file
- `provider`: string - The storage provider key used for the upload

#### Scenario: Response type safety
- **GIVEN** a successful upload
- **WHEN** the client receives the response
- **THEN** the response is fully typed with `url`, `key`, `size`, `contentType`, and `provider` fields

## ADDED Requirements
### Requirement: Provider-Scoped Storage URLs
The system SHALL encode the storage provider in newly generated public storage URLs and use that provider for serving and deletion.

#### Scenario: Serve provider-scoped URL
- **GIVEN** a file was uploaded with provider "aliyun-oss"
- **AND** the returned URL is `/api/storage/aliyun-oss/{key}`
- **WHEN** the user requests the returned URL
- **THEN** the server retrieves the object from Aliyun OSS

#### Scenario: Delete provider-scoped URL
- **GIVEN** a file was uploaded with provider "r2"
- **AND** the returned URL is `/api/storage/r2/{key}`
- **WHEN** the owner requests deletion for the returned URL
- **THEN** the server deletes the object from R2

#### Scenario: Serve legacy unscoped URL
- **GIVEN** an existing file URL does not include a provider segment
- **WHEN** the user requests the legacy URL
- **THEN** the server retrieves the object from the configured default storage provider
