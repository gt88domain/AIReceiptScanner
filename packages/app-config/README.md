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

Product-owned settings belong in `product-config.ts`. Track template core
modifications with the `template-kit` modification manifest.
