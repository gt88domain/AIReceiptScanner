# Change: Update native Apple sign-in to use Expo identity token

## Why
The current native Apple login path depends on browser OAuth callback and Apple auth code exchange. That path is unstable in the current Cloudflare Workers runtime, while Better Auth already supports Apple `idToken` verification for native sign-in.

## What Changes
- Add native Apple sign-in via `expo-apple-authentication` and Better Auth `idToken` sign-in.
- Limit the Apple login entrypoint to iOS only.
- Remove Apple auth code exchange configuration from the server.
- Simplify Apple server configuration to a single `APPLE_APP_BUNDLE_IDENTIFIER` env.

## Impact
- Affected specs: `native-authentication`
- Affected code: `apps/native` auth UI and social sign-in hook, `apps/server` auth provider config, native/server env examples, Expo app config
