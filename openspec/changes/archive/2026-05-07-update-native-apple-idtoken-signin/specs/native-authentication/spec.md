## ADDED Requirements

### Requirement: Native iOS Apple sign-in SHALL use Apple identity token authentication
The native application SHALL use `expo-apple-authentication` to obtain an Apple `identityToken` on iOS and SHALL authenticate with Better Auth using the `idToken` sign-in API instead of browser-based Apple OAuth callback flow.

#### Scenario: User signs in with Apple on iOS
- **WHEN** an iOS user taps the Apple sign-in entry from the native sign-in screen
- **THEN** the app opens the native Apple authentication sheet, receives an `identityToken`, and sends it to Better Auth using `authClient.signIn.social({ provider: "apple", idToken: ... })`

#### Scenario: User cancels Apple sign-in
- **WHEN** the user dismisses the Apple authentication sheet without completing sign-in
- **THEN** the app does not create a session and does not show a failure toast

### Requirement: Native Apple sign-in entry SHALL be iOS-only
The native application SHALL render the Apple sign-in entry only on iOS.

#### Scenario: User opens the sign-in screen on Android
- **WHEN** an Android user opens the native sign-in screen
- **THEN** the Apple sign-in entry is not rendered and other sign-in methods remain available

### Requirement: Server SHALL validate native Apple identity tokens without auth code exchange
The server SHALL keep Apple provider support for Better Auth `idToken` verification and SHALL not require Apple auth code exchange configuration for native Apple sign-in.

#### Scenario: Server receives Apple identity token sign-in request
- **WHEN** the native app sends a Better Auth social sign-in request with `provider: "apple"` and an `idToken`
- **THEN** the server validates the Apple token using the native app bundle identifier and does not depend on `/callback/apple` token exchange or Apple client secret generation
