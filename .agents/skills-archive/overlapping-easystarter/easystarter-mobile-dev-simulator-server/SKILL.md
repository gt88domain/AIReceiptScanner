---
name: easystarter-mobile-dev-simulator-server
description: "Start EasyStarter Mobile simulator + Server local development. Use whenever the user wants to run the native app locally, start the iOS/Android simulator, launch the dev server for mobile, debug mobile API calls, test mobile auth locally, or says 'run the app', 'start native dev', 'simulator not connecting', 'mobile dev setup', 'pnpm dev:native'."
---

# EasyStarter Mobile Simulator + Server

The simulator can reach `localhost` directly -- no tunnel needed. This skill covers launching both processes, configuring the local env file, and verifying the connection.

## Decision Tree

- **First time running native locally** --> Full Setup (all sections below)
- **Already set up, just need to start** --> Section 3 (Launch Commands)
- **Simulator can't reach Server** --> Section 2 (env check) + Common Mistakes
- **Need native modules (Apple Sign-In, RevenueCat, SecureStore)** --> Section 4 (Development Build)
- **Auth callback redirects fail** --> Section 5 (Scheme + Trusted Origins)

## Section 1: How the Native App Finds the Server

The native app reads its Server URL from `EXPO_PUBLIC_SERVER_API_URL` at build time. This value is used in two places:

```typescript
// apps/native/lib/auth/auth.client.ts
export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_SERVER_API_URL,
  // ...
});

// apps/native/lib/orpc.ts
export const baseUrl = process.env.EXPO_PUBLIC_SERVER_API_URL;
if (!baseUrl) {
  throw new Error("EXPO_PUBLIC_SERVER_API_URL is required");
}
```

For simulator dev, this must point to `http://localhost:3001`.

## Section 2: Local Env File

Create `apps/native/.env.development.local` from the example:

```bash
cp apps/native/.env.development.local.example apps/native/.env.development.local
```

Required values for simulator dev:

| Variable | Value | Notes |
|----------|-------|-------|
| `EXPO_PUBLIC_SERVER_API_URL` | `http://localhost:3001` | Simulator can reach localhost |
| `EXPO_PUBLIC_WEB_APP_URL` | `http://localhost:3000` | For opening /terms, /privacy links |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | your key or placeholder | Only needed if testing purchases |
| `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` | `pro` | Default entitlement ID |
| `EXPO_PUBLIC_OPENPANEL_CLIENT_ID` | placeholder | Analytics -- optional for local dev |
| `EXPO_PUBLIC_OPENPANEL_CLIENT_SECRET` | placeholder | Analytics -- optional for local dev |

The `.env.development.local` file is loaded by Expo during `expo start`. EAS cloud builds use `eas.json` env blocks instead -- do not change `eas.json` for local simulator work.

## Section 3: Launch Commands

**Both together (recommended):**
```bash
pnpm dev:native+server
```
This runs `turbo run dev --filter=native --filter=server --parallel`, starting Wrangler on port 3001 and Expo dev server simultaneously.

**Separately (if you need independent terminals):**
```bash
# Terminal 1 — Server on port 3001
pnpm dev:server

# Terminal 2 — Expo dev server
pnpm dev:native
```

**iOS simulator specifically:**
```bash
# Build and run on iOS simulator (requires Xcode)
pnpm -F native dev:ios-simulator
```

**Android emulator specifically:**
```bash
pnpm -F native dev:android-simulator
```

## Section 4: Development Build vs Expo Go

Expo Go does not support native modules used by this project. You need a **development build** for:
- Apple Sign-In (`expo-apple-authentication`)
- RevenueCat (`react-native-purchases`)
- SecureStore (`expo-secure-store`)
- Deep link callback with custom scheme

To create a development build:
```bash
# Local build (requires Xcode / Android Studio)
pnpm -F native prebuild
pnpm -F native ios          # or: pnpm -F native android

# Cloud build via EAS
pnpm -F native eas:build:ios:development
```

The `eas.json` development profile has `"developmentClient": true`:
```jsonc
// apps/native/eas.json — development profile
{
  "development": {
    "developmentClient": true,
    "distribution": "internal",
    "environment": "development",
    "env": {
      "EXPO_PUBLIC_SERVER_API_URL": "https://server.easystarter.dev",
      // ...
    }
  }
}
```

Note: the `env` in `eas.json` is for EAS cloud builds. Local dev reads `.env.development.local` instead.

## Section 5: Auth Callback Scheme

The native auth callback URL is built from the scheme in `app-config`:

```typescript
// apps/native/configs/app-config.ts
export function getAuthConfig(): AuthConfig {
  const scheme = commonConfig.app.nativeScheme;  // "easystarter-native"
  return {
    scheme,
    callbackURL: createDeepLinkURL(scheme, nativeRoutes.authSignIn),
    // produces: easystarter-native:///callback
  };
}
```

This scheme must match `app.json`:
```json
{
  "expo": {
    "scheme": "easystarter-native"
  }
}
```

And the server must trust it:
```typescript
// apps/server/src/lib/auth.ts — trustedOrigins
trustedOrigins: [
  env.WEBSITE_URL || "",
  nativeConfig.app.name + "://",  // "easystarter-native://"
  // Dev-mode Expo origins added automatically in development
],
```

## Server-Side Prerequisites

The Server needs its own `.dev.vars` file. At minimum for mobile auth:

| Variable | Required For |
|----------|-------------|
| `BETTER_AUTH_SECRET` | All auth flows |
| `SERVER_URL` | `http://localhost:3001` for local dev |
| `WEBSITE_URL` | `http://localhost:3000` for local dev |
| `APPLE_APP_BUNDLE_IDENTIFIER` | Apple Sign-In (must match `app.json` `ios.bundleIdentifier`) |

See the `easystarter-mobile-cloudflare` or `easystarter-mobile-database` skills for full server setup.

## Verification

1. Start both: `pnpm dev:native+server`
2. Server should log `Ready on http://localhost:3001`
3. Open the app in the simulator
4. Navigate to a screen that calls the API -- confirm no network error
5. Test sign-in flow -- should complete and redirect back to the app

## Common Mistakes

- **Using `eas.json` env values for local dev** -- EAS env blocks are for cloud builds only. Local simulator reads `apps/native/.env.development.local`. If that file is missing, the app falls back to whatever `EXPO_PUBLIC_*` is in the shell environment, which is usually nothing.
- **Running Expo Go instead of a development build** -- Apple Sign-In, RevenueCat, and SecureStore crash in Expo Go. If you see "Invariant Violation" on launch, you likely need `pnpm -F native prebuild && pnpm -F native ios`.
- **Server not running when app starts** -- The oRPC client throws immediately if `EXPO_PUBLIC_SERVER_API_URL` is set but unreachable. Start the server first or use the combined command.
- **Stale env after changing `.env.development.local`** -- Expo caches env vars. Run `pnpm dev:native` with `--clear` (the default script already includes this flag) or restart the Metro bundler.
