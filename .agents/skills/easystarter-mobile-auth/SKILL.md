---
name: easystarter-mobile-auth
description: Configure EasyStarter Mobile authentication end-to-end. Use whenever the user mentions mobile login, Apple sign-in, native auth, Google OAuth on mobile, email/password on native, email OTP, OAuth callback, deep link, app scheme, Better Auth Expo, or says "configure mobile auth", "set up Apple login", "fix native sign-in", "auth callback not working", "session not persisting on device".
---

# EasyStarter Mobile Auth

Mobile auth uses the same Better Auth server as web but with critical native-specific differences: the **Expo plugin** for token storage in SecureStore, **deep-link callbacks** via the app scheme instead of HTTP redirects, and **native Apple Sign-In** that sends an `idToken` directly (no browser redirect). A mismatch between the app scheme in `app.json`, the callback URL built by the auth client, and the `trustedOrigins` on the server is the #1 cause of broken native login.

## Decision Tree

- **Enable/disable a login method** -> Section 1 (config switches) + Section 3 (env vars)
- **Fix OAuth callback not completing** -> Section 2 (app scheme and trusted origins)
- **Apple Sign-In not working** -> Section 4 (Apple-specific config)
- **Set up mobile auth from scratch** -> Read `references/full-setup-guide.md`
- **Physical device development** -> Section 5 (ngrok/HTTPS requirement)
- **Session not persisting after app restart** -> Section 6 (SecureStore and cookie)

## Section 1: Auth Config Switches

All native auth UI visibility is driven by a single object in `packages/app-config/src/app-config.ts`:

```typescript
// packages/app-config/src/app-config.ts — common.auth.methods
auth: {
  methods: {
    emailPasswordEnabled: true,   // email + password form
    emailOtpEnabled: true,        // email one-time code
    githubEnabled: true,          // GitHub OAuth (NOT shown on mobile)
    googleEnabled: true,          // Google OAuth button
    appleEnabled: true,           // Apple Sign-In (iOS only)
  },
},
```

These flow to the native UI via `apps/native/configs/app-config.ts`:

```typescript
// apps/native/configs/app-config.ts
auth: {
  methods: {
    emailPasswordEnabled: commonConfig.auth.methods.emailPasswordEnabled ?? false,
    emailOtpEnabled: commonConfig.auth.methods.emailOtpEnabled ?? false,
    githubEnabled: commonConfig.auth.methods.githubEnabled ?? false,
    googleEnabled: commonConfig.auth.methods.googleEnabled ?? false,
    appleEnabled: commonConfig.auth.methods.appleEnabled ?? false,
  },
},
```

The social buttons component (`apps/native/components/auth/social-sign-in-buttons.tsx`) reads these switches:

```typescript
// apps/native/components/auth/social-sign-in-buttons.tsx
const isAppleSignInVisible = appConfig.auth.methods.appleEnabled && Platform.OS === "ios";
const isGoogleSignInVisible = appConfig.auth.methods.googleEnabled;
```

Note: Apple Sign-In is iOS-only (`Platform.OS === "ios"`). GitHub OAuth is not surfaced on mobile.

## Section 2: App Scheme, Callback URL, and Trusted Origins

The native auth client uses the Better Auth Expo plugin with deep-link callbacks:

```typescript
// apps/native/lib/auth/auth.client.ts
export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_SERVER_API_URL,
  plugins: [
    expoClient({
      scheme: authConfig.scheme,         // "easystarter-native"
      storagePrefix: authConfig.storagePrefix,
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});
```

The callback URL is built from the app scheme + route:

```typescript
// apps/native/configs/app-config.ts
callbackURL: createDeepLinkURL(scheme, nativeRoutes.authSignIn),
// Result: "easystarter-native://callback"
```

The server must trust this scheme. In `apps/server/src/lib/auth.ts`:

```typescript
trustedOrigins: [
  env.WEBSITE_URL || "",
  nativeConfig.app.name + "://",    // "easystarter-native://"
  // Dev Expo origins added in development mode
],
```

**The three values that must match:**
1. `app.json` -> `expo.scheme`: `"easystarter-native"`
2. `packages/app-config/src/app-config.ts` -> `native.app.nativeScheme`: `"easystarter-native"`
3. Server trustedOrigins uses `nativeConfig.app.name + "://"` which reads from the same config

## Section 3: Environment Variables

| Variable | Where | Scope |
|----------|-------|-------|
| `EXPO_PUBLIC_SERVER_API_URL` | `apps/native/.env.development.local` + `eas.json` env blocks | Public -- server base URL |
| `BETTER_AUTH_SECRET` | `apps/server/.dev.vars` | Secret -- generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | `apps/server/wrangler.jsonc` vars | Public |
| `GOOGLE_CLIENT_SECRET` | `apps/server/.dev.vars` | Secret |
| `APPLE_APP_BUNDLE_IDENTIFIER` | `apps/server/wrangler.jsonc` vars + `.dev.vars` | Must match `app.json` `ios.bundleIdentifier` |
| `RESEND_API_KEY` | `apps/server/.dev.vars` | Secret -- needed if email auth is enabled |

For EAS cloud builds, `eas.json` env blocks override `.env.production`:

```json
// apps/native/eas.json — build.production.env
{
  "EXPO_PUBLIC_SERVER_API_URL": "https://server.easystarter.dev",
  "EXPO_PUBLIC_WEB_APP_URL": "https://cf.easystarter.dev"
}
```

## Section 4: Apple Sign-In (iOS-Native idToken Flow)

Apple Sign-In on native does NOT use browser redirects. It uses the iOS native dialog via `expo-apple-authentication` and sends the `idToken` directly to Better Auth:

```typescript
// apps/native/hooks/use-social-sign-in.ts — Apple flow
const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});

await authClient.signIn.social({
  provider: "apple",
  idToken: {
    token: credential.identityToken,
    user: buildAppleIdTokenUser(credential),  // name + email from first sign-in
  },
});
```

The server verifies this token in `apps/server/src/lib/apple-auth.ts`:

```typescript
// apps/server/src/lib/apple-auth.ts
const verificationOptions = {
  algorithms: [alg],
  audience: env.APPLE_APP_BUNDLE_IDENTIFIER,  // MUST match app.json ios.bundleIdentifier
  issuer: "https://appleid.apple.com",
  maxTokenAge: "1h",
};
```

**Critical**: `APPLE_APP_BUNDLE_IDENTIFIER` on the server MUST equal `app.json` -> `expo.ios.bundleIdentifier` (currently `native.easystarter.dev`). If they differ, token verification fails silently.

Apple only sends the user's name and email on the FIRST sign-in. The `buildAppleIdTokenUser` function captures these from the credential and passes them to Better Auth.

## Section 5: Physical Device Development (ngrok)

Simulators can reach `localhost:3001` directly, but physical devices need HTTPS over the network:

1. Start the server: `pnpm dev:server`
2. Start ngrok: `ngrok http 3001`
3. Set `EXPO_PUBLIC_SERVER_API_URL` in `.env.development.local` to the ngrok HTTPS URL
4. Restart Expo: `pnpm dev:native`

The server's `trustedOrigins` already includes `exp://` patterns for development, so Expo dev client requests are allowed automatically.

## Section 6: OAuth Callback Flow

After a browser-based OAuth redirect (Google), the server redirects back to the app scheme. The callback screen (`apps/native/app/(auth)/callback.tsx`) processes the cookie:

```typescript
// apps/native/app/(auth)/callback.tsx — callback flow
SecureStore.setItem(authConfig.cookieStorageKey, nextCookie);
const sessionResult = await authClient.getSession();
if (sessionResult.data?.user) {
  // Navigate home
}
```

The auth provider (`apps/native/providers/auth-provider.tsx`) manages session state and syncs with RevenueCat when payments are enabled.

## Verification

After any auth change:
1. `pnpm dev:native+server` -- start both locally
2. Test each enabled login method on simulator/device
3. For Apple: test on a real iOS device (simulator Apple Sign-In uses sandbox Apple IDs)
4. For Google: complete the full OAuth redirect and confirm the callback completes
5. `pnpm check-types` -- catch type mismatches from config changes

## Common Mistakes

- **`APPLE_APP_BUNDLE_IDENTIFIER` does not match `app.json` `ios.bundleIdentifier`** -- Apple idToken verification fails silently because the `audience` claim check fails. Both must be `native.easystarter.dev` (or your custom bundle ID).
- **Changing `app.json` scheme without updating `app-config.ts` `nativeScheme`** -- the callback URL uses the scheme from config, but Expo routing uses the scheme from `app.json`. If they differ, OAuth redirects land nowhere.
- **Testing Apple Sign-In on simulator** -- the simulator only supports sandbox Apple IDs. Always test the full Apple flow on a physical device with a real Apple ID before shipping.
- **Forgetting `EXPO_PUBLIC_SERVER_API_URL` in `eas.json`** -- for EAS cloud builds, `eas.json` env blocks are the source of truth. The `.env.production` file is NOT used by EAS builds.
- **Using HTTP URL for `EXPO_PUBLIC_SERVER_API_URL` on physical device** -- iOS App Transport Security blocks HTTP. Use ngrok or a real HTTPS server URL.
- **Deleting provider code instead of disabling** -- set the config switch to `false` in `app-config.ts`. The server provider code stays in place for re-enablement.
