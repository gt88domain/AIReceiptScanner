# i18n

Shared translation messages and locale helpers.

Message surfaces:

- common
- web
- server
- native

Keep keys stable and add translations for every supported locale when adding
user-visible copy.

The first launch publishes `en` only. Complete zh/jp catalogs are kept in
`archive/packages/i18n-dormant-catalogs`; its README documents how to restore
them. The archive is outside the active workspace, so downstream projects can
restore multilingual support without carrying dormant catalogs in normal
builds and checks.
