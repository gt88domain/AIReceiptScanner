## ADDED Requirements
### Requirement: Dashboard Security Page
The system SHALL provide a dashboard Security page where signed-in users can manage password-related actions.

#### Scenario: User requests a reset email
- **WHEN** a signed-in user with a password submits the reset request
- **THEN** the system sends a reset email and confirms submission in the UI

#### Scenario: Social login without password
- **WHEN** a signed-in user does not have a password set
- **THEN** the UI provides a set-password entry point instead of reset

### Requirement: Localized Reset Email
The system SHALL send reset password emails from the server using Better Auth, with subject and body localized to the request locale.

#### Scenario: Localized email is sent
- **WHEN** a reset request is received with a locale
- **THEN** the email subject and body use the matching locale messages

#### Scenario: Locale fallback
- **WHEN** a reset request does not include a supported locale
- **THEN** the email uses the default locale messages

### Requirement: Set Password Flow
The system SHALL allow signed-in social-login users without a password to set a password via a dedicated Security sub-route.

#### Scenario: Set password success
- **WHEN** a signed-in user without a password submits a valid new password
- **THEN** the system sets the password and confirms success in the UI
