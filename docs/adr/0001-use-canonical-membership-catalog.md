# Use a canonical Membership Catalog for membership semantics

Membership semantics should be owned by a canonical Membership Catalog in `packages/app-config`, not inferred from web payment configuration or duplicated between web and native payment catalogs. We choose canonical membership plans first, with platform and provider identifiers attached as adapter data, because membership tier and entitlement semantics are product concepts while Stripe and RevenueCat identifiers are provider concerns.

## Considered Options

- Keep web payments as the semantic source and validate native payments against it.
- Keep separate web and native payment catalogs with cross-catalog validation.
- Use a canonical Membership Catalog and attach web/native provider data to it.

## Consequences

The `membership` module becomes the source for Membership Catalog, Membership Tier, Membership Entitlement, and checkout policy semantics. Existing `payments` modules should become thinner provider/payment adapters over time, starting with removing native-to-web semantic dependency and replacing copied entitlement-resolution tests with tests against the real module interface.
