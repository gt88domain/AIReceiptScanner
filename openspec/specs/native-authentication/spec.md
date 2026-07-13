# native-authentication Specification

## Purpose
TBD - created by archiving change email-otp-login. Update Purpose after archive.
## Requirements
### Requirement: Native sign-in SHALL support email OTP mode

The native app SHALL provide an email OTP sign-in and registration flow that uses the same server-side email OTP contract as the web app.

#### Scenario: User requests an email OTP from native

- **WHEN** a native user enters a valid email address and requests an email OTP
- **THEN** the native app sends a sign-in OTP request to the authentication server
- **AND** the native app transitions to a code entry screen or state

#### Scenario: User signs in with email OTP from native

- **WHEN** a native user enters the correct one-time code for the email address used in the request step
- **THEN** the native app signs the user in through the Better Auth client
- **AND** the native app refreshes its authenticated session state

#### Scenario: New user registers with email OTP from native

- **WHEN** a native user verifies an OTP for an email address without an existing account
- **THEN** the native app passes a default display name to the authentication client
- **AND** the authentication server creates the user and refreshes the authenticated session state

### Requirement: Native email OTP UI SHALL handle resend and error states

The native email OTP UI SHALL provide resend controls, validation feedback, loading states, and localized copy consistent with the existing native auth experience.

#### Scenario: Native resend cooldown

- **WHEN** a native user successfully requests an email OTP
- **THEN** the native app disables the resend action until the cooldown deadline has elapsed

#### Scenario: Native invalid OTP response

- **WHEN** the authentication server rejects an email OTP verification attempt
- **THEN** the native app shows the returned error message
- **AND** the native app keeps the user in the code entry state

