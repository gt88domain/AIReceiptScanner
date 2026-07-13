---
name: easystarter-mobile-quick-launch
description: Get the EasyStarter Mobile app running from zero to a working build. Use when someone says "set up the mobile app", "get started with native", "launch the app on my phone", "first time iOS build", "connect mobile to server", "EAS build setup", "how do I run the native app", or "quick start mobile".
---

# EasyStarter Mobile Quick Launch

Get from a fresh clone to a working native build connected to the deployed server. The main friction points are app identity (bundle ID, scheme, EAS project), server connectivity (env URLs), and payment provider keys.

## Decision Tree

- **First time setup from scratch** -> Read `references/mobile-quick-launch-walkthrough.md`
- **App builds but can't reach server** -> Section 3 (env vars) -- check `EXPO_PUBLIC_SERVER_API_URL`
- **OAuth/deep link callbacks broken** -> Section 2 (scheme alignment)
- **EAS build failing** -> Section 4 (EAS project link)
- **Need to run on simulator first** -> Section 5 (dev commands)
- **Ready for App Store submission** -> Section 6 (production checklist)

## Section 1: App Identity

Three files define who the app is to Apple/Google and to Expo:

```json
// apps/native/app.json — the source of truth for native identity
{
  "expo": {
    "name": "EasyStarterNative",
    "slug": "easystarter-native",
    "scheme": "easystarter-native",
    "ios": {
      "bundleIdentifier": "native.easystarter.dev",
      "appleTeamId": "8622M955TV"
    },
    "android": {
      "package": "xnative.easystarter.dev"
    },
    "extra": {
      "eas": {
        "projectId": "a96a5332-a517-4a91-bfce-06c3af159735"
      }
    }
  }
}
```

```typescript
// packages/app-config/src/app-config.ts — native.app section
native: {
  app: {
    name: "easystarter-native",
    nativeScheme: "easystarter-native",  // MUST match app.json scheme
  },
  routes: {
    authSignIn: "/callback",             // deep-link callback path
  },
},
```

| Field | File | Must match |
|-------|------|------------|
| `expo.scheme` | `apps/native/app.json` | `native.app.nativeScheme` in `app-config.ts` |
| `ios.bundleIdentifier` | `apps/native/app.json` | `APPLE_APP_BUNDLE_IDENTIFIER` server env |
| `eas.projectId` | `apps/native/app.json` | Output of `eas init` |
| `slug` | `apps/native/app.json` | EAS project name |

## Section 2: Scheme Alignment

The app scheme connects three systems: Expo deep links, auth callbacks, and server trusted origins.

The callback URL is built as `{scheme}://{authSignIn route}` -> `easystarter-native://callback`

The server trusts this in `apps/server/src/lib/auth.ts`:

```typescript
trustedOrigins: [
  env.WEBSITE_URL || "",
  nativeConfig.app.name + "://",    // "easystarter-native://"
],
```

If `app.json` scheme differs from `app-config.ts` `nativeScheme`, OAuth redirects silently fail.

## Section 3: Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `EXPO_PUBLIC_SERVER_API_URL` | `apps/native/eas.json` env blocks | Server API base URL (e.g. `https://server.easystarter.dev`) |
| `EXPO_PUBLIC_WEB_APP_URL` | `apps/native/eas.json` env blocks | Web app URL for links/sharing |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | `apps/native/eas.json` env blocks | RevenueCat iOS SDK key (starts with `appl_`) |
| `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` | `apps/native/eas.json` env blocks | RevenueCat entitlement name (default: `"pro"`) |
| `EXPO_PUBLIC_OPENPANEL_CLIENT_ID` | `apps/native/eas.json` env blocks | Analytics client ID |
| `EXPO_PUBLIC_OPENPANEL_CLIENT_SECRET` | `apps/native/eas.json` env blocks | Analytics client secret |

EAS builds read env from `eas.json`, NOT from `.env.production`. Each build profile (development, preview, production) has its own env block:

```json
// apps/native/eas.json — build.production.env
{
  "EXPO_PUBLIC_SERVER_API_URL": "https://server.easystarter.dev",
  "EXPO_PUBLIC_WEB_APP_URL": "https://cf.easystarter.dev",
  "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY": "appl_GutoexiMibsvBDxBTXJvcjYvRWR",
  "EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID": "pro"
}
```

For local simulator development, use `apps/native/.env.development.local` (gitignored).

## Section 4: EAS Project Link

The EAS project ID in `app.json` connects the local project to the Expo cloud:

```bash
# Run once from apps/native/ to link the project
cd apps/native && npx eas init
```

This writes `extra.eas.projectId` into `app.json`. Without it, `eas build` and `eas update` fail.

## Section 5: Step Overview

| Step | Command / Action | Verify |
|------|-----------------|--------|
| 1. Install deps | `pnpm install` from repo root | No errors |
| 2. Set app identity | Edit `app.json` bundle ID, scheme, team ID | Values match your Apple/Google accounts |
| 3. Link EAS | `cd apps/native && npx eas init` | `projectId` appears in `app.json` |
| 4. Configure env | Edit `eas.json` env blocks with your URLs/keys | `EXPO_PUBLIC_SERVER_API_URL` points to deployed server |
| 5. Deploy server | `pnpm deploy:server` | Server responds at your URL |
| 6. Dev build (sim) | `pnpm dev:native+server` | App launches in simulator, can sign in |
| 7. Dev build (device) | `pnpm dev:ios-device+server` | App launches on physical device |
| 8. Production build | `pnpm -F native eas:build:ios:production` | Build succeeds on EAS |
| 9. Submit | `pnpm -F native eas:submit:ios:production` | Uploaded to App Store Connect |

## Section 6: Dev Commands

```bash
# Simulator development (web + server + native)
pnpm dev:native+server

# Physical iOS device
pnpm dev:ios-device+server

# Physical Android device
pnpm dev:android-device+server

# Production iOS build via EAS
pnpm -F native eas:build:ios:production

# Submit to App Store
pnpm -F native eas:submit:ios:production

# OTA update (no new binary needed)
pnpm -F native eas:update:production
```

## Common Mistakes

- **`EXPO_PUBLIC_SERVER_API_URL` set to `localhost` in `eas.json`** -- EAS cloud builds cannot reach your local machine. Use the deployed server URL. For local dev, set it in `.env.development.local` instead.
- **Scheme mismatch between `app.json` and `app-config.ts`** -- the auth callback URL uses the scheme from `app-config.ts`, but Expo routing uses the scheme from `app.json`. Both must be identical or OAuth callbacks silently fail.
- **Missing `eas init` before first build** -- without `projectId` in `app.json`, EAS commands fail with a cryptic "project not found" error.
- **Editing `.env.production` for EAS builds** -- EAS ignores `.env.production`. Environment variables for cloud builds go in `eas.json` env blocks per profile.
- **Forgetting to deploy server before testing mobile** -- the native app connects to the server URL in env. If the server is not deployed or running, auth and API calls fail.
- **Using HTTP URL on physical iOS device** -- iOS App Transport Security blocks plain HTTP. Use ngrok (`ngrok http 3001`) for local dev on physical devices.

## Verification

1. `pnpm dev:native+server` -- app launches, splash screen appears
2. Sign in with at least one auth method
3. Navigate through tabs -- no blank screens or API errors
4. If payments enabled: premium screen loads RevenueCat offerings
5. `pnpm check-types` -- no type errors from config changes
