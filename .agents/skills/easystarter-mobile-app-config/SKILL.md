---
name: easystarter-mobile-app-config
description: "Configure EasyStarter Mobile app.json identifiers and app-config native fields. Use whenever the user wants to change the app name, bundle ID, Android package, scheme, slug, Apple team ID, EAS project ID, app icons, splash screen, deep link scheme, or says 'rename the app', 'change bundle identifier', 'set up app.json', 'configure app identity', 'eas init'."
---

# EasyStarter Mobile App Config

App identity lives in two files that must stay synchronized: `apps/native/app.json` (Expo/EAS reads this) and `packages/app-config/src/app-config.ts` (runtime code reads this). A mismatch between the two -- especially `scheme` vs `nativeScheme` -- breaks deep links and auth callbacks silently.

## Decision Tree

- **Setting up a new app from the template** --> All sections, top to bottom
- **Changing app name only** --> Section 1 + Section 2
- **Changing bundle ID / package name** --> Section 1 + Section 3 (cross-references)
- **Setting up EAS project** --> Section 4
- **Deep link / auth callback broken after rename** --> Section 3 (scheme sync)
- **Changing app icons or splash** --> Section 5

## Section 1: app.json Identity Fields

The template ships with these values that must be replaced:

```json
// apps/native/app.json — fields to customize
{
  "expo": {
    "name": "EasyStarterNative",          // App Store display name
    "slug": "easystarter-native",          // EAS project slug (URL-safe)
    "version": "1.0.0",                   // Semver shown in app stores
    "scheme": "easystarter-native",        // Deep link scheme (e.g. myapp://)
    "ios": {
      "appleTeamId": "8622M955TV",         // Your Apple Developer Team ID
      "buildNumber": "1.0.0",             // iOS build number
      "bundleIdentifier": "native.easystarter.dev",  // iOS bundle ID
      "deploymentTarget": "16.4",
      "usesAppleSignIn": true,             // Keep true if using Apple Sign-In
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "package": "xnative.easystarter.dev"  // Android package name
    },
    "extra": {
      "eas": {
        "projectId": "a96a5332-a517-4a91-bfce-06c3af159735"  // From eas init
      }
    },
    "runtimeVersion": {
      "policy": "appVersion"               // OTA update compatibility
    },
    "updates": {
      "url": "https://u.expo.dev/a96a5332-a517-4a91-bfce-06c3af159735"
    }
  }
}
```

## Section 2: app-config.ts Runtime Fields

The runtime config in `packages/app-config/src/app-config.ts` has native-specific fields that must match `app.json`:

```typescript
// packages/app-config/src/app-config.ts — native section
native: {
  app: {
    name: "easystarter-native",        // Must match app.json slug
    nativeScheme: "easystarter-native", // MUST match app.json scheme
  },
  routes: {
    authSignIn: "/callback",           // Deep link path for auth callback
    termsOfService: "/terms",          // Opens web URL
    privacyPolicy: "/privacy",
    resetPassword: "/reset-password",
  },
  // ...
}
```

And the common section has fields used in both UI and sharing:

```typescript
// packages/app-config/src/app-config.ts — common.app
common: {
  app: {
    name: "EasyStarter",               // Display name in UI
    nativeScheme: "easystarter-native", // Also here for cross-platform access
    supportEmail: "support@easystarter.com",
    websiteUrl: "https://www.easystarter.com",
    socialUrl: "https://x.com/ios_1261142602",
    appStoreUrl: "https://apps.apple.com/app/id",  // Add your App Store ID
  },
}
```

## Section 3: Cross-Reference Checklist

These values MUST match across files:

| Value | app.json field | app-config field | Server field |
|-------|---------------|-----------------|--------------|
| Deep link scheme | `expo.scheme` | `native.app.nativeScheme` + `common.app.nativeScheme` | trusted origin in `auth.ts` |
| iOS bundle ID | `expo.ios.bundleIdentifier` | -- | `APPLE_APP_BUNDLE_IDENTIFIER` in `wrangler.jsonc` |
| App name (slug) | `expo.slug` | `native.app.name` | trusted origin uses this |

The server trusts the native app by its name:
```typescript
// apps/server/src/lib/auth.ts — trustedOrigins
trustedOrigins: [
  env.WEBSITE_URL || "",
  nativeConfig.app.name + "://",  // "easystarter-native://"
],
```

Apple Sign-In verification uses the bundle identifier:
```typescript
// apps/server/src/lib/apple-auth.ts
const verificationOptions = {
  audience: env.APPLE_APP_BUNDLE_IDENTIFIER,  // Must match app.json ios.bundleIdentifier
  issuer: "https://appleid.apple.com",
};
```

The native auth client builds callbacks from the scheme:
```typescript
// apps/native/configs/app-config.ts
export function getAuthConfig(): AuthConfig {
  const scheme = commonConfig.app.nativeScheme;
  return {
    scheme,
    callbackURL: createDeepLinkURL(scheme, nativeRoutes.authSignIn),
    // e.g. easystarter-native:///callback
  };
}
```

## Section 4: EAS Project Setup

If starting fresh, run `eas init` to generate a project ID:

```bash
cd apps/native
pnpm dlx eas-cli init
```

This updates `app.json` with:
- `extra.eas.projectId` -- unique EAS project identifier
- `updates.url` -- `https://u.expo.dev/{projectId}` for OTA updates

The `runtimeVersion` policy controls OTA update compatibility:
```json
"runtimeVersion": {
  "policy": "appVersion"  // OTA updates only apply to matching app version
}
```

## Section 5: Icons and Splash Screen

Icon and splash assets are in `apps/native/assets/images/`:

```json
// apps/native/app.json — asset references
{
  "icon": "./assets/images/icon.png",
  "ios": {
    "icon": {
      "dark": "./assets/images/icon.png",
      "light": "./assets/images/icon.png"
    }
  },
  "android": {
    "adaptiveIcon": {
      "backgroundColor": "#E6F4FE",
      "foregroundImage": "./assets/images/android-icon-foreground.png",
      "backgroundImage": "./assets/images/android-icon-background.png",
      "monochromeImage": "./assets/images/android-icon-monochrome.png"
    }
  },
  "plugins": [
    ["expo-splash-screen", {
      "image": "./assets/images/icon.png",
      "imageWidth": 200,
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    }]
  ]
}
```

Replace the image files in `apps/native/assets/images/` with your own assets. iOS icon should be 1024x1024. Android adaptive icon needs foreground (1024x1024 with safe zone) and background layers.

## Verification

After changing identity fields:
1. `pnpm check-types` -- catch type mismatches from config changes
2. `pnpm dev:native+server` -- verify the app launches with the new name/scheme
3. Test auth sign-in flow -- callback should redirect using the correct scheme
4. If you changed `bundleIdentifier`, you need a new development build: `pnpm -F native prebuild && pnpm -F native ios`

## Common Mistakes

- **Changing `app.json` scheme but not `app-config.ts` nativeScheme** -- Auth callbacks use `nativeScheme` from app-config to build the redirect URL. If they don't match, OAuth sign-in completes on the server but the app never receives the callback.
- **Forgetting `APPLE_APP_BUNDLE_IDENTIFIER` in `wrangler.jsonc`** -- Apple Sign-In token verification checks the `audience` claim against this value. If it doesn't match `app.json` `ios.bundleIdentifier`, Apple Sign-In silently fails with "verify failed" in server logs.
- **Running `eas init` from the repo root instead of `apps/native/`** -- EAS init must run from the directory containing `app.json`. Running from root creates a separate EAS project.
- **Changing bundle ID without rebuilding** -- Changing `bundleIdentifier` in `app.json` requires a fresh native build (`prebuild` + build). The old development build on the simulator still has the old bundle ID registered.
- **Using spaces or special characters in scheme** -- The scheme must be URL-safe (lowercase letters, numbers, hyphens). `"My App"` will break deep links.
