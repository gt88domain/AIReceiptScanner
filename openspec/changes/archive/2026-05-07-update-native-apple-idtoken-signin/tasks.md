## 1. Implementation
- [x] 1.1 Add `expo-apple-authentication` to the native app and enable the required Expo/iOS configuration.
- [x] 1.2 Replace the native Apple browser OAuth path with `AppleAuthentication.signInAsync()` and Better Auth `idToken` sign-in.
- [x] 1.3 Render the Apple sign-in entry only on iOS and preserve the existing Google social sign-in flow.
- [x] 1.4 Remove Apple auth code exchange logic and extra Apple env requirements from the server.
- [x] 1.5 Update OpenSpec/documentation and environment examples to match the new native Apple sign-in model.
- [x] 1.6 Run native and server TypeScript checks and fix issues until both pass.
