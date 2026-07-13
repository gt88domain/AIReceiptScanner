# Native Local Builds Guide

## Overview

This guide explains how to build the native app locally without using EAS cloud builds.

Use this workflow when you want to:

- generate Android APK or AAB files on your machine
- create an iOS archive or IPA locally with Xcode
- verify `EXPO_PUBLIC_*` environment variables before shipping
- test native integrations without waiting for EAS

This repository already contains committed native projects:

- `apps/native/ios`
- `apps/native/android`

That means you can build directly with Xcode and Gradle.

## When to Use This Instead of EAS

Use local builds when:

- you want faster iteration on one machine
- you need to inspect native build output directly
- you want full control over signing and export steps
- you do not want to upload build jobs to EAS cloud

Use EAS when:

- you want managed cloud signing and distribution
- you need remote build infrastructure
- your local machine is missing native toolchains

## Prerequisites

Install dependencies from the repo root:

```bash
pnpm install
```

For iOS local builds, you also need:

- Xcode
- CocoaPods
- an Apple Developer account for release signing

For Android local builds, you also need:

- Android Studio
- Android SDK
- Java configured for Gradle

## Environment Variables

The native app expects Expo public environment variables in:

- `apps/native/.env.local`
- `apps/native/.env.production`

Example:

```env
EXPO_PUBLIC_SERVER_API_URL=https://your-server-url.com
EXPO_PUBLIC_WEB_APP_URL=https://your-web-url.com
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_android_key
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
```

Important:

- `EXPO_PUBLIC_*` values are compiled into the app bundle
- after changing them, rebuild the app
- hot reload is not enough

## Local Development Build vs Local Release Build

These commands are useful for development builds installed directly on a simulator or device:

```bash
cd apps/native
npx expo run:ios
npx expo run:android
```

They are useful for local native testing, but they are not the same as producing release artifacts.

For distributable release outputs, use Xcode archive or Gradle release tasks.

## Android Local Builds

From the native Android project:

```bash
cd apps/native/android
```

### Build a Release APK

```bash
./gradlew assembleRelease
```

Output:

```text
apps/native/android/app/build/outputs/apk/release/app-release.apk
```

### Build a Release AAB

```bash
./gradlew bundleRelease
```

Output:

```text
apps/native/android/app/build/outputs/bundle/release/app-release.aab
```

### Signing Note

The current Android project is configured to sign the `release` build with the debug keystore.

That is acceptable for local verification, but not for Play Store distribution.

Before shipping Android publicly, replace the debug signing config in:

- `apps/native/android/app/build.gradle`

with your own release keystore configuration.

## iOS Local Builds

The iOS project workspace is:

- `apps/native/ios/EasyStarterNative.xcworkspace`

### Recommended: Build with Xcode

1. Open `apps/native/ios/EasyStarterNative.xcworkspace` in Xcode.
2. Select the `EasyStarterNative` scheme.
3. Select `Any iOS Device (arm64)` for a release archive.
4. Run `Product > Archive`.
5. Use Organizer to export the archive.

This is the easiest way to produce a signed local iOS build.

### Build an Archive with CLI

```bash
cd apps/native/ios

xcodebuild \
  -workspace EasyStarterNative.xcworkspace \
  -scheme EasyStarterNative \
  -configuration Release \
  -sdk iphoneos \
  -archivePath build/EasyStarterNative.xcarchive \
  archive
```

Output:

```text
apps/native/ios/build/EasyStarterNative.xcarchive
```

After the archive is created, export it with Xcode Organizer or `xcodebuild -exportArchive` if you already have an `ExportOptions.plist`.

### CocoaPods

If native dependencies change, reinstall pods:

```bash
cd apps/native/ios
pod install
```

## TestFlight and Embedded Expo Assets

You can upload a locally archived iOS build to TestFlight.

For a Release archive, Expo JavaScript and static assets are bundled into the app binary. That includes:

- the JS bundle
- images
- fonts
- other packaged app assets

This means a TestFlight build does not depend on your local Metro server.

Important distinction:

- `npx expo run:ios` in development may load code from Metro
- Xcode `Archive` for Release embeds the app bundle into the binary

This project also uses `expo-updates`, so runtime behavior works like this:

1. the app ships with an embedded update created at build time
2. on first install, the app can run using that embedded bundle
3. later, if a compatible OTA update is downloaded, the app can run the newer update instead

If no newer OTA update has been downloaded, the embedded build-time bundle is the fallback source of truth.

## Recommended Local Release Flow

1. Update `apps/native/.env.local` or `apps/native/.env.production`.
2. Rebuild the app from scratch.
3. For Android, run `assembleRelease` or `bundleRelease`.
4. For iOS, archive with Xcode or `xcodebuild`.
5. Install the build on a real device and verify:
   - auth callback
   - legal links
   - RevenueCat initialization
   - payment flow

## Troubleshooting

### Payment UI is unavailable locally

Check:

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`

Then rebuild the app. Do not rely on a previously installed binary.

### Privacy or Terms links do not open

Check:

- `EXPO_PUBLIC_WEB_APP_URL`

Then rebuild the app so the new public environment variable is compiled into the native bundle.

### Android release build succeeds but is not store-ready

That usually means the app is still signed with the debug keystore. Configure a real release keystore before publishing.

### iOS archive fails on signing

Check:

- the Apple team in `app.json`
- the selected signing identity in Xcode
- provisioning profiles for the bundle identifier

## Related Docs

- [Native RevenueCat Payments Configuration Guide](./native-revenuecat-payments.md)
- [Native Email Verification with ngrok](./native-email-verification-with-ngrok.md)
