## ADDED Requirements

### Requirement: Native sign-in SHALL offer phone number as an alternative method
The native sign-in experience SHALL let the user choose phone number authentication alongside the existing email and social methods.

#### Scenario: User opens phone sign-in
- **WHEN** the user selects the phone sign-in method from the native auth screen
- **THEN** the app renders phone number entry and can continue into OTP verification without leaving the auth flow

#### Scenario: Verification completes sign-in
- **WHEN** the user submits a valid OTP
- **THEN** the native client creates the authenticated session and follows the existing post-login navigation path

### Requirement: Native OTP verification SHALL support platform autofill semantics
The native OTP screen SHALL be structured for platform OTP autofill and SHALL keep resend behavior predictable.

#### Scenario: iOS OTP autofill is available
- **WHEN** the app renders the OTP input on iOS
- **THEN** the input uses `textContentType="oneTimeCode"` so the system can offer the SMS code for autofill

#### Scenario: Resend is temporarily disabled
- **WHEN** the OTP request succeeds
- **THEN** the resend action remains disabled for 60 seconds and becomes available again after the cooldown expires

### Requirement: Native auth-related account surfaces SHALL treat email as optional for phone-only accounts
The native application SHALL avoid exposing internal compatibility emails in auth-related account surfaces for phone-only users.

#### Scenario: Phone-only user opens profile surfaces
- **WHEN** a signed-in phone-only user opens the native profile header or security screen
- **THEN** the UI shows a user-facing identifier without exposing the internal compatibility email

#### Scenario: Phone-only user opens native security settings
- **WHEN** a signed-in phone-only user opens the native security screen
- **THEN** the UI does not present the email reset action that depends on a real email address
