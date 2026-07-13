# app-config

Non-secret cross-platform business configuration.

Use this package for:

- app metadata
- auth method flags
- payment/credit configuration
- storage upload rules
- route constants

Do not store secrets here. Runtime secrets belong in platform env/secret
systems.

Future optional module toggles such as `siteModules.discovery.enabled` should be
small and documented in `CUSTOMIZATIONS.md` when added.
