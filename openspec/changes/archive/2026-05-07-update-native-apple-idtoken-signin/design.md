## Context
The native app already uses Better Auth Expo integration for browser-based social sign-in. Apple sign-in is the exception because the browser callback flow depends on Apple auth code exchange from the server, and that flow is failing in the current edge runtime.

## Goals / Non-Goals
- Goals:
  - Move Apple native sign-in to `identityToken` verification
  - Keep Google sign-in unchanged
  - Reduce Apple server configuration to bundle-id-based verification
- Non-Goals:
  - Replace other social providers
  - Remove generic Better Auth callback routes used by Google or email flows

## Decisions
- Decision: Use `expo-apple-authentication` on iOS and call `authClient.signIn.social({ provider: "apple", idToken: ... })`.
- Decision: Keep Apple login visible only on iOS.
- Decision: Use `APPLE_APP_BUNDLE_IDENTIFIER` as both Better Auth Apple `clientId` and `appBundleIdentifier`.
- Decision: Remove Apple client secret generation and all code-flow-only Apple envs.

## Risks / Trade-offs
- Apple sign-in now requires a native iOS build and cannot be fully validated in Expo Go.
- The Apple login button will use the platform-provided Apple button component instead of the existing custom button styling to stay aligned with Apple platform guidance.

## Migration Plan
1. Add native Apple auth dependency and iOS configuration.
2. Switch the native Apple login path to `identityToken`.
3. Remove server Apple code exchange configuration.
4. Update docs and env examples.

## Open Questions
- None.
