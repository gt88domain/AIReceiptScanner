# Mobile Quick Launch Walkthrough

This walkthrough takes the optional mobile package from a fresh clone to a
native build connected to the API Worker. Mobile lives at `optional/mobile` and
has its own dependency graph.

## Prerequisites

- Xcode or Android Studio for the target platform
- Node.js and pnpm versions supported by the repository
- Expo account; run `pnpm dlx eas-cli login` when cloud builds are needed
- Apple Developer or Google Play account for store builds
- A reachable API Worker for physical-device and cloud-build testing

## 1. Enable and install mobile

Set `productConfig.common.features.mobile` to `true` in
`packages/app-config/src/product-config.ts`, then install both workspaces:

```bash
pnpm install
pnpm --dir optional install
```

The first command installs the default Web/API workspace. The second installs
the separate optional workspace; neither command replaces the other.

## 2. Configure app identity

Replace the placeholders in `optional/mobile/app.json`:

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "scheme": "your-app-scheme",
    "ios": {
      "appleTeamId": "YOUR_APPLE_TEAM_ID",
      "bundleIdentifier": "com.yourcompany.yourapp"
    },
    "android": {
      "package": "com.yourcompany.yourapp"
    }
  }
}
```

Set the same scheme in `packages/app-config/src/app-config.ts` at
`appConfig.native.app.nativeScheme`. When Apple sign-in is enabled, set the
server's `APPLE_APP_BUNDLE_IDENTIFIER` to the iOS bundle identifier.

## 3. Link the EAS project

```bash
cd optional/mobile
pnpm dlx eas-cli init
```

Verify that `optional/mobile/app.json` now contains the assigned EAS project ID
and that `expo.updates.url` uses the same ID.

## 4. Configure environments

Replace the `your-*` URLs and public provider identifiers in each required
profile under `optional/mobile/eas.json`. For local Expo development, create the
gitignored `optional/mobile/.env.development.local`:

```dotenv
EXPO_PUBLIC_SERVER_API_URL=http://localhost:3001
EXPO_PUBLIC_WEB_APP_URL=http://localhost:3000
```

Use HTTPS URLs reachable from the internet for physical devices and EAS builds.
All `EXPO_PUBLIC_*` values are client-visible; never put server secrets there.

## 5. Run locally

Use separate terminals so API and mobile failures remain easy to diagnose:

```bash
# Terminal 1, from the repository root
pnpm dev:server

# Terminal 2, from the repository root
pnpm mobile:dev
```

For a connected physical device:

```bash
pnpm mobile:ios-device
# or
pnpm mobile:android-device
```

A physical device cannot use your computer's `localhost`. Point
`EXPO_PUBLIC_SERVER_API_URL` at a deployed API or an HTTPS tunnel.

## 6. Build and submit

Only after identity, environment, authentication, and enabled purchases work:

```bash
pnpm mobile:eas:build:ios:production
pnpm mobile:eas:build:android:production

pnpm --dir optional --filter mobile run eas:submit:ios:production
pnpm --dir optional --filter mobile run eas:submit:android:production
```

For a JavaScript-only update compatible with the installed runtime:

```bash
pnpm --dir optional --filter mobile run eas:update:production
```

## Recommended verification

Run these only when automated verification was requested:

```bash
pnpm mobile:doctor
pnpm mobile:check
```

Then manually verify one enabled authentication path against the target API. If
native billing is enabled, also confirm that RevenueCat returns the exact
product-owned catalog rather than template placeholders.
