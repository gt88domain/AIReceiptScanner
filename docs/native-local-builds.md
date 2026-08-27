# Native local builds

The optional Expo app uses the managed/prebuild workflow. Native `ios/` and
`android/` projects are not committed; Expo or EAS generates them when a local
native build needs them.

## Prerequisites

Install the separate optional workspace first:

```bash
pnpm --dir optional install
cp optional/mobile/.env.development.local.example optional/mobile/.env.development.local
```

For iOS, install Xcode and use an Apple Developer account when signing a release.
For Android, install Android Studio, the Android SDK, and the JDK required by
the current Expo SDK.

## Development builds

These commands generate native projects when necessary and install a
development build on a simulator/device:

```bash
pnpm --dir optional --filter mobile run ios
pnpm --dir optional --filter mobile run android
```

Use development builds for custom-scheme callbacks, Apple sign-in, and real
RevenueCat SDK behavior. Expo Go remains useful for UI and API iteration but is
not the final native-integration environment.

Generated native directories are local build artifacts. Do not treat them as
the product configuration source or commit them without an explicit decision to
adopt Expo's bare/native-project workflow.

## Local release builds

The repository exposes EAS local-build scripts:

```bash
pnpm --dir optional --filter mobile run eas:build:ios:production:local
pnpm --dir optional --filter mobile run eas:build:android:production:local
```

EAS reads `optional/mobile/eas.json` and the app identity in
`optional/mobile/app.json`. Configure signing credentials through the standard
EAS/Xcode/Android mechanisms; do not add keystores, certificates, provisioning
profiles, or provider secrets to Git.

## Environment and rebuild rules

- Development values live in `optional/mobile/.env.development.local`.
- Local production values live in `optional/mobile/.env.production`.
- Every `EXPO_PUBLIC_*` value is embedded in the client bundle and must not be
  a secret.
- Restart Expo after changing public environment values. Rebuild the native app
  when a change affects native configuration, plugins, signing, or an installed
  binary.

Before distribution, verify the installed artifact on a real device, including
auth callbacks, legal links, RevenueCat initialization, purchases, and restore
behavior. Automated or device verification is run only when explicitly
requested for the task.

## Related documentation

- [Optional mobile package](./mobile-package.md)
- [RevenueCat configuration](./native-revenuecat-payments.md)
- [Native email verification with ngrok](./native-email-verification-with-ngrok.md)
