## ADDED Requirements

### Requirement: Storage Provider Interface
The system SHALL define a `StorageProvider` interface that abstracts storage operations from specific implementations. Users can implement custom providers by following this interface.

#### Scenario: Provider interface contract
- **GIVEN** a storage provider implementation
- **WHEN** the provider is used by the storage service
- **THEN** it MUST implement the following methods:
  - `put(key, data, options?)` - Store data at key
  - `get(key)` - Retrieve data and metadata by key
  - `head(key)` - Retrieve metadata only by key
  - `delete(key)` - Remove data at key

#### Scenario: Provider returns consistent types
- **GIVEN** any storage provider implementation
- **WHEN** operations return data
- **THEN** the return types MUST match the interface definitions regardless of underlying provider

#### Scenario: Custom provider implementation
- **GIVEN** a user wants to use a different storage backend (S3, GCS, local, etc.)
- **WHEN** they implement the `StorageProvider` interface
- **THEN** the storage service SHALL work with their custom provider without modification

### Requirement: R2 Storage Provider (Default)
The system SHALL provide an R2StorageProvider as the default implementation for Cloudflare R2.

#### Scenario: R2 provider wraps R2Bucket
- **GIVEN** a Cloudflare R2Bucket binding
- **WHEN** an R2StorageProvider is created
- **THEN** it SHALL wrap the R2Bucket and implement all StorageProvider methods

#### Scenario: R2 provider maps types correctly
- **GIVEN** an R2StorageProvider instance
- **WHEN** operations are performed
- **THEN** R2-specific types (R2Object, R2ObjectBody) SHALL be mapped to generic StorageObject types

#### Scenario: R2 is the default provider
- **GIVEN** no custom provider is configured
- **WHEN** the storage service is initialized
- **THEN** R2StorageProvider SHALL be used by default

### Requirement: Storage Provider Factory
The system SHALL provide a factory function to create storage providers based on configuration.

#### Scenario: Create R2 provider via factory
- **GIVEN** a provider type of 'r2' and an R2Bucket binding
- **WHEN** `createStorageProvider('r2', { bucket })` is called
- **THEN** an R2StorageProvider instance SHALL be returned

#### Scenario: Factory supports custom providers
- **GIVEN** a user-implemented StorageProvider
- **WHEN** they pass it to the storage service
- **THEN** the service SHALL use their custom provider

### Requirement: Form-based File Upload
The system SHALL support multipart/form-data file uploads via HTTP POST endpoint.

#### Scenario: Upload file via form
- **GIVEN** an authenticated user
- **WHEN** they POST to `/api/storage/upload` with multipart/form-data containing:
  - `file` - The file to upload
  - `purpose` - Upload purpose (avatar, attachment)
- **THEN** the file SHALL be stored and a JSON response with the file URL returned

#### Scenario: Form upload validates file type
- **GIVEN** a form upload request
- **WHEN** the file content-type is not allowed for the purpose
- **THEN** the request SHALL be rejected with a 400 error

#### Scenario: Form upload validates file size
- **GIVEN** a form upload request
- **WHEN** the file size exceeds the limit for the purpose
- **THEN** the request SHALL be rejected with a 400 error

#### Scenario: Form upload streams large files
- **GIVEN** a large file upload
- **WHEN** the file is received
- **THEN** it SHALL be streamed to storage without loading entirely into memory

## MODIFIED Requirements

### Requirement: Storage Service Provider Injection
The storage service SHALL accept a StorageProvider instead of a raw R2Bucket.

#### Scenario: Service uses injected provider
- **GIVEN** a StorageProvider instance
- **WHEN** `createStorageService(context)` is called
- **THEN** the service SHALL use the provider from context for all storage operations

#### Scenario: Existing service API unchanged
- **GIVEN** the refactored storage service
- **WHEN** consumers call service methods (upload, get, delete, exists, generateKey)
- **THEN** the method signatures and return types SHALL remain unchanged

### Requirement: Context Storage Integration
The application context SHALL provide a storage service backed by a StorageProvider.

#### Scenario: Context creates provider from environment
- **GIVEN** a Hono context with STORAGE binding
- **WHEN** `createContext()` is called
- **THEN** it SHALL create an R2StorageProvider from the binding and pass it to the storage service

#### Scenario: Context exposes storage service
- **GIVEN** the application context
- **WHEN** handlers access `context.storage`
- **THEN** they SHALL receive a fully configured StorageService instance
