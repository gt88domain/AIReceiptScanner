# web-authentication Specification

## Purpose
TBD - created by archiving change email-otp-login. Update Purpose after archive.
## Requirements
### Requirement: Web sign-in SHALL support email OTP mode

The web sign-in page SHALL provide an email OTP sign-in and registration mode while keeping the existing email/password sign-in mode available.

#### Scenario: User requests an email OTP from web

- **WHEN** a user enters a valid email address and requests an email OTP
- **THEN** the web app sends a sign-in OTP request to the authentication server
- **AND** the web app transitions to a code entry state without placing the email address in the URL

#### Scenario: User signs in with email OTP from web

- **WHEN** a user enters the correct one-time code for the email address used in the request step
- **THEN** the web app signs the user in through the authentication client
- **AND** the web app navigates to the dashboard

#### Scenario: New user registers with email OTP from web

- **WHEN** a user verifies an OTP for an email address without an existing account
- **THEN** the web app passes a default display name to the authentication client
- **AND** the authentication server creates the user and signs the user in

#### Scenario: User keeps password sign-in available

- **WHEN** the user chooses password mode in the email sign-in area
- **THEN** the web app shows the existing email/password form and forgot-password entry point

### Requirement: Web email OTP UI SHALL handle resend and error states

The web email OTP UI SHALL provide resend controls, validation feedback, loading states, and localized copy for all supported web locales.

#### Scenario: Resend cooldown

- **WHEN** a user successfully requests an email OTP
- **THEN** the web app disables the resend action until the cooldown deadline has elapsed

#### Scenario: Invalid OTP response

- **WHEN** the authentication server rejects an email OTP verification attempt
- **THEN** the web app shows the returned error message
- **AND** the web app keeps the user in the code entry state

#### Scenario: Change email during OTP flow

- **WHEN** a user chooses to change the email address during the OTP flow
- **THEN** the web app returns to the email entry state
- **AND** the web app clears the previously entered one-time code

