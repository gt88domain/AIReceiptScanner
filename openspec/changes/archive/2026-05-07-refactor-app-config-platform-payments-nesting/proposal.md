# Change: Nest app payments config under platform sections

## Why
The current `appConfig` shape still keeps a top-level `payments` block while payments are consumed with platform-specific semantics. This creates an unnecessary cross-platform grouping and weakens config boundaries.

## What Changes
- Move payment config from top-level `appConfig.payments` into platform sections:
  - `appConfig.web.payments`
  - `appConfig.native.payments`
- Remove top-level `payments` from `AppConfig`.
- Make `web.payments` and `native.payments` optional in types.
- Add fallback defaults when optional payments config is missing:
  - web provider defaults to `stripe`, plans defaults to `[]`
  - native provider defaults to `revenuecat`, plans defaults to `[]`
- Migrate all internal reads from `appConfig.payments.*` to platform-nested paths.

## Impact
- Affected code:
  - `packages/app-config/src/types.ts`
  - `packages/app-config/src/app-config.ts`
  - `packages/app-config/src/payments/web.ts`
  - `packages/app-config/src/payments/native.ts`
  - `apps/server/src/configs/server-config.ts`
  - `docs/config-architecture.md`
- Breaking scope: internal code importing and using `appConfig.payments` directly.
