# Change: Add current-user storage list API

## Why
The OSS dashboard currently persists upload history in browser localStorage, which can leak records across accounts on the same browser and can crash when stored data is malformed. The server should provide the authoritative list of files owned by the current user.

## What Changes
- Add a protected `storage.list` oRPC endpoint.
- List files by the current authenticated user's storage prefixes.
- Support provider selection so the OSS dashboard can list Aliyun OSS files while default storage flows can list R2 files.
- Return provider-scoped URLs plus file metadata for display and follow-up delete/preview actions.
- Update the OSS dashboard page to load records from `storage.list` instead of localStorage.

## Impact
- Affected specs: storage
- Affected code:
  - apps/server/src/storage/types.ts
  - apps/server/src/storage/providers/r2.ts
  - apps/server/src/storage/providers/aliyun-oss.ts
  - apps/server/src/routers/common/storage.ts
  - apps/web/src/routes/_authed/(dashboard)/oss.tsx
