## ADDED Requirements
### Requirement: Current User Storage Listing
The system SHALL provide a protected `storage.list` capability that returns files owned by the authenticated user from a selected storage provider.

#### Scenario: List attachment files for current user
- **GIVEN** an authenticated user
- **AND** files exist under `attachments/{userId}/`
- **WHEN** the user calls `storage.list` with purpose "attachment"
- **THEN** the response includes only files under that user's attachment prefix
- **AND** each file includes `url`, `key`, `size`, `contentType`, `provider`, and `uploadedAt`

#### Scenario: List files from explicit provider
- **GIVEN** an authenticated user
- **WHEN** the user calls `storage.list` with provider "aliyun-oss"
- **THEN** the system lists files from Aliyun OSS
- **AND** returned URLs include the "aliyun-oss" provider segment

#### Scenario: Reject unauthenticated list
- **GIVEN** an unauthenticated user
- **WHEN** the user calls `storage.list`
- **THEN** the request fails with UNAUTHORIZED error

#### Scenario: Prevent arbitrary prefix listing
- **GIVEN** an authenticated user
- **WHEN** the user calls `storage.list`
- **THEN** the server derives list prefixes from the current user's id
- **AND** the caller cannot list another user's prefix
