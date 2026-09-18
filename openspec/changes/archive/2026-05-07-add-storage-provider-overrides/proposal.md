# Change: Add per-upload storage provider overrides

## Why
Some dashboard flows need to target Aliyun OSS while existing product flows should continue using the default R2 storage provider. The current storage configuration selects one global provider, so a successful upload can write to the wrong backend for pages that expect a specific provider.

## What Changes
- Add an optional storage provider override to `storage.upload`.
- Keep the default storage provider for existing upload callers that do not specify a provider.
- Return provider-scoped storage URLs so file serving and deletion can route to the same provider used during upload.
- Update the Aliyun OSS dashboard page to upload through `aliyun-oss` explicitly while other pages keep default behavior.

## Impact
- Affected specs: storage
- Affected code:
  - packages/app-config/src/app-config.ts
  - packages/app-config/src/storage/*
  - apps/server/src/storage/*
  - apps/server/src/routers/common/storage.ts
  - apps/server/src/handlers/storage.ts
  - apps/web/src/routes/_authed/(dashboard)/oss.tsx
