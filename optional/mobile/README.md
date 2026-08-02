# Native App

React Native + Expo app for TanStack Template.

## Get Started

1. Install dependencies from the repo root

   ```bash
   pnpm install
   ```

2. Start the Expo dev server

   ```bash
   cd optional/mobile
   pnpm dev
   ```

3. Open the app with one of the following:

- Expo Go
- iOS Simulator
- Android emulator
- Development build

## Recommended Development Modes

### Expo Go

Use Expo Go for:

- UI development
- navigation checks
- API debugging
- form interactions

Start it with:

```bash
cd optional/mobile
pnpm dev
```

If LAN discovery is unstable, try:

```bash
cd optional/mobile
npx expo start --tunnel
```

### `npx expo run:ios`

Use `npx expo run:ios` when you need native app behavior, especially for:

- auth callback testing
- deep linking
- custom URL scheme handling
- email verification redirects
- native Apple sign-in

Run it with:

```bash
cd optional/mobile
npx expo run:ios
```

This is the recommended mode for testing the Better Auth email verification callback flow.

It is also the recommended mode for testing Apple sign-in because Apple login now uses the native iOS authentication sheet, not browser OAuth.

## Deep Link and Auth Callback Notes

This app uses a custom URL scheme:

```text
com.aiarticles.template://
```

The auth callback route is:

```text
com.aiarticles.template:///callback
```

### Important limitation of Expo Go

Expo Go usually cannot validate the final auth callback redirect for this project because:

- Expo Go does not install your app as a standalone native app
- Expo Go does not reliably register your custom scheme for system-wide callback handling
- tapping `com.aiarticles.template:///callback` from Mail or Safari may not reopen your project

If you need to test:

- sign-up email verification
- deep link callback handling
- redirect back into the app after browser auth

use:

```bash
cd optional/mobile
npx expo run:ios
```

instead of Expo Go.

## Environment Variables

The native app reads its API base URL from:

- `optional/mobile/.env.development.local`
- `optional/mobile/.env.production`

Example:

```env
EXPO_PUBLIC_SERVER_API_URL=https://your-server-url.com
EXPO_PUBLIC_WEB_APP_URL=https://your-web-url.com
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_revenuecat_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_revenuecat_android_key
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
EXPO_PUBLIC_OPENPANEL_CLIENT_ID=your-openpanel-client-id
EXPO_PUBLIC_OPENPANEL_CLIENT_SECRET=your-openpanel-client-secret
```

After changing env values, fully restart Expo or rerun the native build.

RevenueCat notes:

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` is the RevenueCat public iOS SDK key.
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` is the RevenueCat public Android SDK key.
- `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` is used by the default `presentPaywallIfNeeded()` helper.
- `EXPO_PUBLIC_WEB_APP_URL` is used for opening legal pages like `/terms` and `/privacy` from the native app.
- `EXPO_PUBLIC_OPENPANEL_CLIENT_ID` and `EXPO_PUBLIC_OPENPANEL_CLIENT_SECRET` enable the native OpenPanel client. The template does not record screen views automatically; call the exported OpenPanel tracking helpers where the product needs explicit events.
- Real purchases require a development build or release build. Expo Go only supports Preview API mode for RevenueCat.
- For the recommended native RevenueCat catalog and `config.plans` structure, see `../../docs/native-revenuecat-payments.md`.
- For local APK, AAB, archive, and IPA workflows without EAS cloud builds, see `../../docs/native-local-builds.md`.

## Email Verification with ngrok

When testing native email verification on a real device, `localhost` will not work inside the email link.

Use the ngrok guide here:

- `../../docs/native-email-verification-with-ngrok.md`

That guide covers:

- exposing the local server through ngrok
- updating `SERVER_URL` and `EXPO_PUBLIC_SERVER_API_URL`
- using `npx expo run:ios` for callback validation

## Learn More

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router documentation](https://docs.expo.dev/router/introduction/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Deep linking with Expo](https://docs.expo.dev/linking/into-your-app/)
