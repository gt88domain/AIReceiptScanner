---
name: easystarter-mobile-quick-launch
description: Get the optional EasyStarter Mobile app running from zero to a working build. Use when someone says "set up the mobile app", "get started with native", "launch the app on my phone", "first time iOS build", "connect mobile to server", "EAS build setup", "how do I run the native app", or "quick start mobile".
---

# EasyStarter Mobile Quick Launch

Mobile is an opt-in package at `optional/mobile`, with its own workspace install
and lockfile. It is not part of the root `apps/*` workspace. Enable it only when
the product needs a native client.

## Decision tree

- First setup: read `references/mobile-quick-launch-walkthrough.md`.
- App cannot reach the API: verify `EXPO_PUBLIC_SERVER_API_URL` and run the API
  separately with `pnpm dev:server`.
- OAuth/deep links fail: align the Expo scheme with
  `appConfig.native.app.nativeScheme` in
  `packages/app-config/src/app-config.ts`.
- EAS cannot identify the project: run `pnpm dlx eas-cli init` from
  `optional/mobile`.
- Simulator or device development: use the root `mobile:*` commands below.

## Source-of-truth files

| Concern | Source of truth |
| --- | --- |
| Expo name, slug, scheme, bundle/package IDs, EAS project ID | `optional/mobile/app.json` |
| Native app scheme consumed by auth | `packages/app-config/src/app-config.ts` (`appConfig.native.app.nativeScheme`) |
| Mobile build environments | `optional/mobile/eas.json` |
| Product capability | `packages/app-config/src/product-config.ts` (`common.features.mobile`) |

`optional/mobile/app.json`'s `expo.scheme` and the native app-config scheme must
match. The iOS bundle identifier must also match the server's
`APPLE_APP_BUNDLE_IDENTIFIER` when Apple sign-in is enabled.

## Install and run

```bash
# Root Web/API workspace.
pnpm install

# Separate optional-mobile workspace.
pnpm --dir optional install

# Terminal 1: API Worker.
pnpm dev:server

# Terminal 2: Expo development server.
pnpm mobile:dev
```

Useful root commands:

```bash
pnpm mobile:ios-device
pnpm mobile:android-device
pnpm mobile:check
pnpm mobile:doctor
pnpm mobile:eas:build:ios:production
pnpm mobile:eas:build:android:production
```

Submission and OTA scripts are intentionally kept in the optional workspace:

```bash
pnpm --dir optional --filter mobile run eas:submit:ios:production
pnpm --dir optional --filter mobile run eas:submit:android:production
pnpm --dir optional --filter mobile run eas:update:production
```

## Environment rules

- Cloud builds read the selected profile in `optional/mobile/eas.json`.
- Local Expo development can use
  `optional/mobile/.env.development.local` (gitignored).
- Never use `localhost` for a cloud build or a physical device. Use a deployed
  API or a temporary HTTPS tunnel.
- Replace every `your-*` value before a production build. Public Expo variables
  are bundled into the client and must never contain server secrets.

## EAS project link

```bash
cd optional/mobile
pnpm dlx eas-cli init
```

Confirm that the command replaced `YOUR_EAS_PROJECT_ID` in `app.json` and that
the update URL contains the same project ID.

## Verification to recommend

Do not run verification unless the user asks. When requested, use the narrowest
applicable commands:

1. `pnpm mobile:doctor`
2. `pnpm mobile:check`
3. `pnpm dev:server` and `pnpm mobile:dev`, then verify one enabled sign-in path
4. If native billing is enabled, verify that the store returns the configured
   RevenueCat products

## Common mistakes

- Running only root `pnpm install`: it deliberately does not install
  `optional/mobile`.
- Using legacy root-workspace paths or filters instead of the `optional/mobile`
  commands above.
- Starting Expo without a reachable API Worker.
- Letting the Expo scheme and native app-config scheme drift.
- Committing provider keys or server secrets to `eas.json`.
- Building with template payment identifiers instead of product-owned IDs.
