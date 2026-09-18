# Internationalization

The repository ships one locale registry and four message surfaces shared by
the web, server, and optional mobile runtimes.

## Sources of truth

| Concern                                                                                     | Owner                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Available catalogs, published locales, default locale, cookie name, display/format metadata | `packages/i18n/src/locales.ts`                    |
| Shared messages                                                                             | `packages/i18n/src/messages/common/<locale>.json` |
| Web messages                                                                                | `packages/i18n/src/messages/web/<locale>.json`    |
| Server errors and email copy                                                                | `packages/i18n/src/messages/server/<locale>.json` |
| Optional mobile messages                                                                    | `packages/i18n/src/messages/native/<locale>.json` |

The repository currently keeps `en`, `zh`, and legacy `jp` catalogs, but only
`en` is published. `availableLocales` preserves typed dormant catalogs;
`supportedLocales` is the publication allowlist consumed by routing, content,
SEO, server locale resolution, and switchers. Do not duplicate either list in
an app. Before publishing Japanese later, migrate the legacy `jp` route key to
the BCP 47 language code `ja` as a dedicated compatibility change.

## Runtime behavior

### Web

The web app uses `use-intl` through `apps/web/src/i18n/`.

- Public routes currently use unprefixed English URLs. When another locale is
  intentionally published, it uses `/<locale>/...`.
- `/api`, `/rpc`, `/dashboard`, and `/users` are not locale-prefixed; they read
  the locale cookie instead.
- Explicit locale URLs synchronize the `locale` cookie.
- `apps/web/src/i18n/client.ts` localizes and de-localizes router URLs.
- `apps/web/src/components/i18n/locale-switcher.tsx` owns the web switcher UI.

Use `useTranslations()` in React components and keep keys within the web message
shape exported by `@repo/i18n/messages`.

### Server

`apps/server/src/i18n/index.ts` combines common and server messages. Locale
resolution prefers the `locale` cookie, then the first `Accept-Language` value,
then English. `createT(locale)` performs key lookup and simple `{name}`-style
parameter replacement for server errors and transactional email copy.

The Hono locale middleware lives at `apps/server/src/middlewares/i18n.ts`.
Server business logic should receive or resolve a locale at the request/email
boundary instead of importing web routing behavior.

### Optional mobile

The mobile app uses `i18next` and `react-i18next` through
`optional/mobile/i18n/`.

- A saved AsyncStorage preference wins over the device locale.
- Dormant and unsupported locale variants normalize to published English.
- `changeLanguage(locale)` updates i18next and persists the choice.
- Native copy comes from the shared `native` message surface.

## Adding or changing copy

For public copy changes, English is the required launch catalog. Dormant
catalogs may be updated later as part of their publication work. Shared errors
belong in `common`; runtime-only copy belongs in `web`, `server`, or `native`.

To add a locale:

1. Add its catalog key to `availableLocales` and all locale metadata records in
   `packages/i18n/src/locales.ts`.
2. Add one JSON file for that locale in every message surface.
3. Add the locale to each typed message map under `packages/i18n/src/messages/`.
4. Complete and review the translations.
5. Add the locale to `supportedLocales` only when it is ready to publish.
6. Confirm web URL behavior, SEO alternates, server header/cookie fallback, and
   mobile locale normalization for the newly published locale.

Keep translation files structurally aligned. TypeScript checks the registered
message maps, but it does not make untranslated or misleading copy correct.
