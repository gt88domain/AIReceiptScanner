## ADDED Requirements

### Requirement: Server SHALL support phone number OTP authentication
The server SHALL support sending and verifying OTP codes for mainland China E.164 phone numbers through Better Auth's phone-number plugin.

#### Scenario: Client requests an OTP
- **WHEN** a client posts a valid `+86` phone number to `POST /api/auth/phone-number/send-otp`
- **THEN** the server dispatches an SMS through the configured `SmsProvider`

#### Scenario: Existing user verifies a phone number
- **WHEN** a client posts a valid code to `POST /api/auth/phone-number/verify` for an existing user
- **THEN** the server marks `phoneNumberVerified` as `true` and creates a session unless `disableSession` is requested

#### Scenario: New user verifies a phone number
- **WHEN** a client posts a valid code to `POST /api/auth/phone-number/verify` for a phone number that is not yet attached to a user
- **THEN** the server creates a new user with a placeholder email and non-phone display name, persists the phone fields, and creates a session

#### Scenario: User signs up with phone only
- **WHEN** a client completes phone verification without providing an email address
- **THEN** the server completes account creation successfully and does not require a user-supplied email in the verification request

#### Scenario: Existing phone-number display names are returned
- **WHEN** an existing phone-only user record has the phone number stored as `name`
- **THEN** server user responses replace that display name with a stable generated user name before returning it

### Requirement: User records SHALL persist phone number fields
The user record SHALL store phone number data separately from email data.

#### Scenario: Phone-authenticated user is stored
- **WHEN** a user completes phone verification successfully
- **THEN** the stored user row includes `phoneNumber` and `phoneNumberVerified`

### Requirement: Server SHALL dispatch and verify SMS through Alibaba Cloud
The server SHALL send and verify SMS OTPs through a provider abstraction and SHALL default to Alibaba Cloud Dypns semantics.

#### Scenario: Mainland China number uses the Alibaba Cloud send API
- **WHEN** the destination phone number starts with `+86`
- **THEN** the provider sends the SMS through `SendSmsVerifyCode` using `CountryCode=86` and the mainland phone number body

#### Scenario: International number is rejected
- **WHEN** the destination phone number has a non-`+86` country code
- **THEN** the request fails validation before an SMS provider call is made

#### Scenario: Verification delegates to the provider
- **WHEN** a client posts a code to `POST /api/auth/phone-number/verify`
- **THEN** the server calls `CheckSmsVerifyCode` and treats `VerifyResult = PASS` as success

#### Scenario: Provider returns a non-success response
- **WHEN** Alibaba Cloud returns a non-`OK` response code
- **THEN** the provider raises a mapped error that the server can log and surface as a failure
