## ADDED Requirements
### Requirement: Aliyun OSS Storage Provider
The system SHALL support an `aliyun-oss` storage provider that implements the existing storage provider protocol for upload, download, metadata lookup, and deletion.

#### Scenario: Upload through Aliyun OSS provider
- **GIVEN** storage provider configuration selects `aliyun-oss`
- **AND** required Alibaba Cloud credentials plus OSS region, bucket, and endpoint are configured
- **WHEN** an authenticated user uploads a valid file through `storage.upload`
- **THEN** the file is stored in Aliyun OSS using the generated storage key
- **AND** the response includes `url`, `key`, `size`, and `contentType`

#### Scenario: Serve through Aliyun OSS provider
- **GIVEN** a file exists in Aliyun OSS
- **WHEN** the user requests the public storage URL
- **THEN** the server retrieves the object through the storage provider
- **AND** returns the object body with content type and cache headers

### Requirement: OSS Dashboard Example
The web dashboard SHALL include an authenticated Aliyun OSS example page that uploads an attachment through the existing storage API.

#### Scenario: Upload file from dashboard example
- **GIVEN** an authenticated dashboard user
- **WHEN** the user selects a valid attachment file and submits the example form
- **THEN** the page calls `storage.upload` with purpose `attachment`
- **AND** displays the returned URL, key, size, and content type
