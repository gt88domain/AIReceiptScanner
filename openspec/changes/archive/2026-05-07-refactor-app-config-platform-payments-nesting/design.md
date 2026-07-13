## Context
`@repo/app-config` already separates shared and platform sections (`common`, `web`, `native`). Payments config is still nested under a top-level `payments` object, even though the values and consumers are platform-specific.

## Goals / Non-Goals
- Goals:
  - Align payments config with the platform-scoped structure.
  - Keep current behavior when full payments config is present.
  - Support optional platform payments with safe defaults.
- Non-Goals:
  - Changing payments provider integrations.
  - Changing web/native payments subpath exports.
  - Altering current plan catalog entries.

## Decisions
- Remove top-level `appConfig.payments`.
- Introduce platform-scoped config locations:
  - `appConfig.web.payments`
  - `appConfig.native.payments`
- Define dedicated platform payment config types in `types.ts`.
- Allow `web.payments` and `native.payments` to be optional.
- Apply deterministic fallbacks in readers:
  - web: provider `stripe`, empty plans
  - native: provider `revenuecat`, empty plans

## Risks / Trade-offs
- Risk: leftover references to `appConfig.payments` break typecheck.
  - Mitigation: repo-wide search and replacement before validation.
- Trade-off: optional sections can hide missing config.
  - Mitigation: defaults are explicit and centralized in payments modules.

## Migration Plan
1. Update `AppConfig`, `AppWebConfig`, and `AppNativeConfig` types.
2. Move config values to `web.payments` and `native.payments` in `app-config.ts`.
3. Update consumers to read platform-nested paths with fallbacks.
4. Validate with repository TypeScript checks.

## Open Questions
- None.
