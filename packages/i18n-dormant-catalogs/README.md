# i18n-dormant-catalogs

Complete, drift-free `zh` and `jp` translation catalogs archived on 2026-09-04
per review CSV LANG-101. The first product launch ships `en` only, so these
catalogs intentionally live outside the `@repo/i18n` build to avoid paying
per-key maintenance for unreachable copy.

Nothing in the main workspace imports this package; it is an archive, not a
dependency.

## Restoring a locale

1. Copy the locale's catalogs back, e.g. for `zh`:
   `cp messages/<surface>/zh.json ../i18n/src/messages/<surface>/zh.json`
   for each surface (`common`, `web`, `server`, `native`) — or re-export them
   from this package and import them in `@repo/i18n` instead.
2. Re-add the import and record entry in
   `packages/i18n/src/messages/<surface>.ts`.
3. Add the locale to `supportedLocales` in `packages/i18n/src/locales.ts`.
4. Follow `docs/i18n-implementation.md` for content, routing, and SEO wiring.

The message-loading pipeline (`LocaleRecord`, `get*Messages`, locale metadata)
already supports multiple locales; only the default build inclusion is
en-only.
