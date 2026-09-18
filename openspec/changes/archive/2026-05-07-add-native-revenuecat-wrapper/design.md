## Context
The native app depends on RevenueCat SDKs but has no centralized integration. We still need one place to initialize the SDK, map offerings to configured native plans, and expose paywall helpers without scattering vendor calls across screens. A direct wrapper module is sufficient; a provider and hook hierarchy is unnecessary for the current app.

## Goals / Non-Goals
- Goals:
  - Provide a single native payments wrapper module.
  - Keep RevenueCat configuration and identity methods centralized.
  - Support both manual offerings purchase flows and RevenueCatUI paywall presentation.
  - Allow iOS and Android to expose different native payment catalogs with their own product identifiers and prices.
  - Avoid startup crashes when native payments are disabled or misconfigured.
- Non-Goals:
  - Implement server-side RevenueCat webhook handling.
  - Add provider state management or billing pages.
  - Extend shared plan schema with entitlement identifiers.

## Decisions
- Decision: Keep auth synchronization as explicit wrapper methods (`logIn`, `logOut`, `syncAppUser`) instead of mounting a global provider.
  - Alternatives considered: a React provider that automatically mirrors Better Auth.
- Decision: Keep SDK keys in Expo public environment variables instead of hardcoded constants.
  - Alternatives considered: `Platform.select(...)` hardcoded keys; rejected because env-based switching is safer for Test Store vs production keys.
- Decision: Put all direct SDK calls behind a single `apps/native/features/payments/index.ts` module.
  - Alternatives considered: separate config, selector, SDK, provider, and hook modules.

## Risks / Trade-offs
- Callers are responsible for deciding when to refresh local UI state after purchase, restore, or auth changes.
- RevenueCat listener updates are not pushed by the backend, so screens still need to opt in if they want live updates.
- When the native payments config is invalid or missing keys, the wrapper degrades to `unavailable` instead of failing fast, which favors app stability over early crash detection.
- Platform catalogs can be asymmetric, so purchase failures and plan mapping must stay specific to the current platform catalog.

## Migration Plan
1. Add the OpenSpec change and native wrapper files.
2. Update env examples and README for new RevenueCat variables.
3. Validate the OpenSpec change and run native verification commands.

## Open Questions
- None for this implementation. Future work can add webhook-backed synchronization and customer attributes in a separate change.
