# server-auth Specification

## Purpose
TBD - created by archiving change email-otp-login. Update Purpose after archive.
## Requirements
### Requirement: Server SHALL support email OTP sign-in and registration

The authentication server SHALL allow a user with an email address to request and verify a one-time code for sign-in or first-time registration without creating a custom session outside Better Auth.

#### Scenario: Existing user requests email OTP

- **WHEN** an existing user requests a sign-in OTP for a valid registered email address
- **THEN** the server stores a verification record for that email sign-in attempt
- **AND** the server sends a localized one-time code email to that address

#### Scenario: Existing user verifies email OTP

- **WHEN** the user submits the correct unexpired one-time code for the registered email address
- **THEN** the server creates an authenticated Better Auth session for that user

#### Scenario: New user requests email OTP

- **WHEN** a sign-in OTP is requested for a valid email address that is not registered
- **THEN** the server stores a verification record for that email sign-in attempt
- **AND** the server sends a localized one-time code email to that address

#### Scenario: New user verifies email OTP

- **WHEN** the user submits the correct unexpired one-time code for an unregistered email address
- **THEN** the server creates a new Better Auth user with that email marked verified
- **AND** the server creates an authenticated Better Auth session for that user

### Requirement: Email OTP verification SHALL be time-limited and attempt-limited

The authentication server SHALL issue six-digit email sign-in codes that expire after five minutes, limit incorrect verification attempts, and avoid storing plaintext OTP values.

#### Scenario: Expired email OTP

- **WHEN** a user submits an email sign-in code after its expiry time
- **THEN** the server rejects the verification attempt
- **AND** the server does not create a session

#### Scenario: Incorrect email OTP

- **WHEN** a user submits an incorrect email sign-in code
- **THEN** the server rejects the verification attempt
- **AND** the server records the failed attempt against the verification record

#### Scenario: Too many email OTP attempts

- **WHEN** a user exceeds the allowed failed attempts for an email sign-in code
- **THEN** the server rejects further verification for that code
- **AND** the server does not create a session

### Requirement: Email OTP SHALL preserve existing auth flows

The authentication server SHALL keep existing email/password, email verification link, and OAuth behavior unchanged while adding email OTP sign-in.

#### Scenario: Email verification link remains available

- **WHEN** a new user signs up with email and password
- **THEN** the server continues sending the existing email verification link email
- **AND** the sign-up verification flow does not require an email OTP code

#### Scenario: Existing login methods remain available

- **WHEN** a user signs in with email/password or OAuth
- **THEN** the server processes the sign-in through the existing flow for that method
