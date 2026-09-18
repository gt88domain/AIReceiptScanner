# Change: Refactor storage provider selection

## Why
Storage currently wires a concrete provider (R2) directly in call sites and wraps it in a thin service. We want a config-driven provider selector with caching to simplify future provider additions while keeping a clean, provider-first API.

## What Changes
- Remove `createStorageService` and `StorageService` from the storage module.
- Add `getStorageProvider()` selector with config-driven provider choice and caching.
- Add `serverConfig.storage` to select a provider (default `r2`).
- Update storage call sites to use provider methods directly (`put/get/head/delete`).

## Impact
- Affected code: `apps/server/src/storage`, `apps/server/src/lib/context.ts`, `apps/server/src/handlers/storage.ts`, `apps/server/src/routers/common/storage.ts`, `apps/server/src/configs/*`.
- Behavior: unchanged for R2; selection becomes configurable via server config.
