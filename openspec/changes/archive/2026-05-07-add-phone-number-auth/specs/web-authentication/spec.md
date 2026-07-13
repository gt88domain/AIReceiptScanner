## ADDED Requirements

### Requirement: Web sign-in SHALL offer phone number as an alternative method
The web sign-in experience SHALL let the user choose phone number authentication alongside the existing email and social methods.

#### Scenario: User switches to phone sign-in
- **WHEN** the user selects the phone sign-in method on the auth screen
- **THEN** the UI renders the phone number form and keeps the existing email and social entry points available

### Requirement: Web SHALL guide OTP verification with resend cooldown
The web auth flow SHALL guide the user from phone number submission to OTP verification and SHALL prevent immediate resend attempts in the client.

#### Scenario: OTP form appears after request
- **WHEN** the user submits a valid phone number and the server accepts the OTP request
- **THEN** the UI transitions to an OTP entry form for that phone number

#### Scenario: Resend is temporarily disabled
- **WHEN** the OTP request succeeds
- **THEN** the resend action remains disabled for 60 seconds and becomes available again after the cooldown expires

#### Scenario: Verification completes sign-in
- **WHEN** the user submits a valid OTP
- **THEN** the web client completes the authenticated session flow and shows the same success path as other sign-in methods

### Requirement: Web auth-related account surfaces SHALL treat email as optional for phone-only accounts
The web application SHALL avoid exposing internal compatibility emails in auth-related account surfaces for phone-only users.

#### Scenario: Phone-only user opens an account surface
- **WHEN** a signed-in phone-only user opens the dashboard user menu or security page
- **THEN** the UI shows a user-facing identifier without exposing the internal compatibility email

#### Scenario: Phone-only user opens security settings
- **WHEN** a signed-in phone-only user opens the dashboard security page
- **THEN** the UI does not present the email reset action that depends on a real email address

#### Scenario: Phone-only user appears in the dashboard users table
- **WHEN** the dashboard users table renders a phone-only user
- **THEN** the table shows a generated display name, the phone number as contact, and the phone verification status
