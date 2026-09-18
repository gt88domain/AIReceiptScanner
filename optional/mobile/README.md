# Optional mobile app

Expo + React Native client using Expo Router. It is intentionally kept in the
separate `optional/` workspace so a web-only product does not install native
dependencies.

## Install and run

From the repository root:

```bash
pnpm --dir optional install
cp optional/mobile/.env.development.local.example optional/mobile/.env.development.local
pnpm mobile:dev
```

Use Expo Go for UI and API iteration. Use a development build for native auth
callbacks, custom-scheme deep links, Apple sign-in, and real RevenueCat SDK
behavior:

```bash
pnpm --dir optional --filter mobile run ios
# or
pnpm --dir optional --filter mobile run android
```

## Configuration ownership

- `app.json` owns app identity, bundle/package identifiers, URL scheme, EAS
  project ID, icons, and native plugins.
- `.env.development.local` and `.env.production` own public native runtime
  values. Expo bundles every `EXPO_PUBLIC_*` value into the app; never put a
  secret there.
- `packages/app-config/src/product-config.ts` decides whether the template's
  mobile capability is part of the product.
- `packages/app-config/src/app-config.ts` owns the native payment catalog and
  shared public app configuration.
- `configs/app-config.ts` adapts shared configuration for the mobile runtime.

The API base URL is `EXPO_PUBLIC_SERVER_API_URL`; legal-page links use
`EXPO_PUBLIC_WEB_APP_URL`. Restart Expo, or rebuild the native app when required,
after changing environment values.

## Important paths

- `app/` — Expo Router routes and layouts
- `components/` — mobile UI and feature components
- `lib/auth/` — Better Auth client integration
- `lib/payments/` — RevenueCat adapter and entitlement helpers
- `i18n/` — native locale detection and i18next wiring
- `providers/` — application providers

## Related guides

- [`../../docs/native-revenuecat-payments.md`](../../docs/native-revenuecat-payments.md)
- [`../../docs/native-local-builds.md`](../../docs/native-local-builds.md)
- [`../../docs/native-email-verification-with-ngrok.md`](../../docs/native-email-verification-with-ngrok.md)
- [`../../docs/mobile-package.md`](../../docs/mobile-package.md)
