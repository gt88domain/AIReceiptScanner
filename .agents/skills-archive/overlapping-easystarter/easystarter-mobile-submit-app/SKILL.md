---
name: easystarter-mobile-submit-app
description: "Build and submit EasyStarter Mobile app to App Store and Google Play. Use whenever the user wants to build a production binary, submit to TestFlight, publish to App Store or Play Store, run EAS build/submit, push an OTA update, check build prerequisites, or says 'submit app', 'build production', 'eas build', 'TestFlight', 'publish to App Store', 'OTA update', 'eas submit'."
---

# EasyStarter Mobile Submit App

EAS Build creates the binary; EAS Submit uploads it to App Store Connect or Google Play Console. Before building, every identifier, env var, and server endpoint must be finalized -- these are baked into the binary and cannot be changed without a new build.

## Decision Tree

- **First production build ever** --> Pre-flight checklist (Section 1) then Section 2
- **Submitting an already-built binary** --> Section 3
- **JS-only change, no new native code** --> Section 4 (OTA update)
- **Build failed** --> Section 5 (common build errors)
- **Need to check EAS CLI setup** --> Section 6

## Section 1: Pre-Flight Checklist

Before building for production, verify all of these:

**app.json identity:**
```json
// apps/native/app.json — must be finalized
{
  "expo": {
    "name": "YourAppName",                    // App Store display name
    "slug": "your-app-slug",                  // EAS project slug
    "version": "1.0.0",                       // Semver for app stores
    "scheme": "your-app-scheme",              // Deep link scheme
    "ios": {
      "appleTeamId": "YOUR_TEAM_ID",
      "bundleIdentifier": "com.yourcompany.yourapp",
      "usesAppleSignIn": true
    },
    "android": {
      "package": "com.yourcompany.yourapp"
    },
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"    // From eas init
      }
    }
  }
}
```

**eas.json production env:**
```jsonc
// apps/native/eas.json — production profile
{
  "build": {
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "environment": "production",
      "env": {
        "EXPO_PUBLIC_SERVER_API_URL": "https://server.yourdomain.com",
        "EXPO_PUBLIC_WEB_APP_URL": "https://app.yourdomain.com",
        "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY": "appl_your_production_key",
        "EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID": "pro",
        "EXPO_PUBLIC_OPENPANEL_CLIENT_ID": "your-client-id",
        "EXPO_PUBLIC_OPENPANEL_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

**Server deployed and working:**
- `SERVER_URL` in wrangler vars matches `EXPO_PUBLIC_SERVER_API_URL` in eas.json
- Production D1 migrations have been run
- Secrets pushed (`BETTER_AUTH_SECRET`, `REVENUECAT_WEBHOOK_SECRET`, etc.)
- RevenueCat webhook URL registered

**app-config matches app.json:**
- `native.app.nativeScheme` matches `app.json` `scheme`
- `common.app.nativeScheme` matches `app.json` `scheme`
- Server `APPLE_APP_BUNDLE_IDENTIFIER` matches `app.json` `ios.bundleIdentifier`

## Section 2: Build Commands

**iOS production build (EAS cloud):**
```bash
pnpm -F native eas:build:ios:production
# Runs: pnpm dlx eas-cli build --platform ios --profile production
```

**iOS production build (local machine):**
```bash
pnpm -F native eas:build:ios:production:local
# Runs: pnpm dlx eas-cli build --platform ios --profile production --local
# Requires Xcode installed
```

**Android production build (EAS cloud):**
```bash
pnpm -F native eas:build:android:production
# Runs: pnpm dlx eas-cli build --platform android --profile production
```

**Android production build (local machine):**
```bash
pnpm -F native eas:build:android:production:local
# Runs: pnpm dlx eas-cli build --platform android --profile production --local
```

The production profile in `eas.json`:
```jsonc
{
  "production": {
    "autoIncrement": true,    // Auto-increments buildNumber/versionCode
    "channel": "production",  // OTA update channel
    "environment": "production"
  }
}
```

`autoIncrement: true` means EAS automatically bumps `ios.buildNumber` and `android.versionCode` each build. You manage `version` (semver) manually in `app.json`.

## Section 3: Submit Commands

After a successful build, submit to app stores:

**iOS (App Store Connect / TestFlight):**
```bash
pnpm -F native eas:submit:ios:production
# Runs: pnpm dlx eas-cli submit --platform ios --profile production
```

This uploads the most recent iOS production build to App Store Connect. The build appears in TestFlight first, then you promote it to App Store review.

**Android (Google Play Console):**
```bash
pnpm -F native eas:submit:android:production
# Runs: pnpm dlx eas-cli submit --platform android --profile production
```

**Prerequisites for submission:**
- iOS: Apple Developer account, app registered in App Store Connect
- Android: Google Play Developer account, app created in Play Console, service account JSON for upload

EAS Submit configuration is in `eas.json`:
```jsonc
{
  "submit": {
    "production": {}
    // Add platform-specific submit config here if needed
    // e.g. "production": { "ios": { "ascAppId": "123456789" } }
  }
}
```

## Section 4: OTA Updates

For JS-only changes (no new native modules, no app.json changes), push an over-the-air update:

```bash
pnpm -F native eas:update:production
# Runs: pnpm dlx eas-cli update --branch production --environment production
```

The update goes to the `production` channel and branch. Installed apps fetch it on next launch (controlled by `runtimeVersion` policy).

```json
// apps/native/app.json
"runtimeVersion": {
  "policy": "appVersion"  // Updates only apply to matching app version
},
"updates": {
  "url": "https://u.expo.dev/your-project-id"
}
```

Other channel commands:
```bash
# Development channel
pnpm -F native eas:update:development

# Preview channel
pnpm -F native eas:update:preview
```

OTA updates do NOT work for:
- Native module changes (adding/removing expo plugins)
- `app.json` changes (version, icons, scheme, permissions)
- `eas.json` env changes (these are build-time only)

## Section 5: Common Build Errors

**"No matching profile found" (iOS):** Your Apple Developer account doesn't have a provisioning profile for the bundle identifier. EAS usually auto-manages this, but check that `ios.bundleIdentifier` is registered in Apple Developer portal.

**"Invalid credentials" (iOS submit):** App Store Connect API key not configured. Run `pnpm dlx eas-cli credentials` to set up.

**"EXPO_PUBLIC_SERVER_API_URL is required" at build time:** The production env block in `eas.json` is missing or the variable name has a typo.

**Build succeeds but app crashes on launch:** Usually a native module mismatch. Check that `app.json` plugins list matches installed native dependencies.

## Section 6: EAS CLI Setup

Check your EAS CLI status:
```bash
pnpm dlx eas-cli --version   # Should be >= 18.4.0 (per eas.json cli.version)
pnpm dlx eas-cli whoami       # Should show your Expo account
pnpm dlx eas-cli login        # If not logged in
```

The CLI version requirement is in `eas.json`:
```jsonc
{
  "cli": {
    "version": ">= 18.4.0",
    "appVersionSource": "remote"  // Version managed by EAS, not local app.json
  }
}
```

## Verification

1. `pnpm -F native eas:build:ios:production` -- build completes
2. Install the build on a real device
3. Test: sign in, make a purchase, verify credits, upload a file
4. `pnpm -F native eas:submit:ios:production` -- appears in TestFlight
5. Test via TestFlight on a different device

## Common Mistakes

- **Building without deploying server first** -- The production binary has `EXPO_PUBLIC_SERVER_API_URL` baked in. If the server isn't deployed at that URL, the app will show network errors on every API call.
- **EAS env in `eas.json` still has template values** -- `"EXPO_PUBLIC_SERVER_API_URL": "https://server.easystarter.dev"` in the template. Replace with your actual production server URL before building.
- **Forgetting to increment `version` in `app.json`** -- `autoIncrement` handles `buildNumber` automatically, but you must manually bump `version` (e.g. "1.0.0" to "1.1.0") for App Store version display. App Store rejects submissions with a version number that's already been used.
- **Submitting before RevenueCat products are set up** -- The app builds fine, but the paywall shows empty products. Create products in App Store Connect / Google Play Console and configure them in RevenueCat before the review build.
- **OTA update after a native change** -- If you added a new Expo plugin or changed `app.json` native config, you need a full binary build. OTA updates only cover JS bundle changes. Pushing an incompatible OTA update causes a crash on launch.
