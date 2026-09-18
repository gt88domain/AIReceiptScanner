# Change: Add platform common direct overrides for app config

## Why
`appConfig` uses `common` as the shared source of truth, but platform-specific customization currently requires duplicating fields or introducing ad-hoc reads. We need a standard way for web/native to override selected common values without copying full common config.

## What Changes
- Add direct common override support to platform config types (`web` and `native`).
- Introduce `AppPlatformCommonConfig` type as a deep-partial shape of `AppCommonConfig` fields.
- Add merged common resolvers:
  - `resolveWebCommonConfig()`
  - `resolveNativeCommonConfig()`
- Keep `resolveCommonConfig()` unchanged for pure shared reads.
- Update docs to explain merged resolver usage.

## Impact
- Affected code:
  - `packages/app-config/src/types.ts`
  - `packages/app-config/src/app-config.ts`
  - `packages/app-config/src/index.ts`
  - `docs/config-architecture.md`
- Behavior: backward compatible unless callers opt into platform direct common overrides.
