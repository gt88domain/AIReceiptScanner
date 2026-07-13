## ADDED Requirements

### Requirement: oRPC File Upload

The system SHALL provide a type-safe file upload capability via oRPC that supports `File` and `Blob` objects natively.

#### Scenario: Successful avatar upload
- **GIVEN** an authenticated user
- **WHEN** the user calls `storage.upload` with a valid image file and purpose "avatar"
- **THEN** the file is stored in R2 with key format `avatars/{userId}/{timestamp}.{ext}`
- **AND** the response includes `url`, `key`, `size`, and `contentType`

#### Scenario: Successful attachment upload
- **GIVEN** an authenticated user
- **WHEN** the user calls `storage.upload` with a valid file and purpose "attachment"
- **THEN** the file is stored in R2 with key format `attachments/{userId}/{timestamp}.{ext}`
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

### Requirement: Upload Input Validation

The system SHALL validate upload inputs using Zod schemas with the following constraints:

- `file`: Must be a `File` instance
- `purpose`: Must be one of `"avatar"` or `"attachment"`

#### Scenario: Missing file rejected
- **WHEN** `storage.upload` is called without a file
- **THEN** the request fails with a Zod validation error

#### Scenario: Invalid purpose rejected
- **WHEN** `storage.upload` is called with an invalid purpose value
- **THEN** the request fails with a Zod validation error

### Requirement: Upload Response Type

The system SHALL return a typed response from `storage.upload` containing:

- `url`: string - The URL path to access the uploaded file
- `key`: string - The storage key for the file
- `size`: number - File size in bytes
- `contentType`: string - MIME type of the uploaded file

#### Scenario: Response type safety
- **GIVEN** a successful upload
- **WHEN** the client receives the response
- **THEN** the response is fully typed with `url`, `key`, `size`, and `contentType` fields

## REMOVED Requirements

### Requirement: HTTP Form Upload Endpoint

**Reason**: Replaced by oRPC-based upload for type safety and API consistency.

**Migration**: Use `client.storage.upload({ file, purpose })` instead of `fetch("/api/storage/upload", { body: formData })`.

The HTTP endpoint `POST /api/storage/upload` is removed in favor of the oRPC procedure.
