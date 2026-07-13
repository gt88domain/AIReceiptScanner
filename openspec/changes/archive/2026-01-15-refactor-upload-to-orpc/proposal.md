# Change: Refactor File Upload from HTTP to oRPC

## Why

The current file upload implementation uses a separate HTTP endpoint (`POST /api/storage/upload`) with manual FormData handling, while the rest of the API uses oRPC for type-safe RPC. oRPC natively supports `File` and `Blob` objects, enabling unified type-safe file uploads with the same patterns used throughout the codebase. This eliminates the need for a separate HTTP client on the frontend and provides end-to-end type safety for file operations.

## What Changes

- **REMOVED**: HTTP endpoint `POST /api/storage/upload` and its handler (`handlers/upload.ts`)
- **ADDED**: oRPC-based `storage.upload` procedure in a new storage router
- **MODIFIED**: Web client to use oRPC client instead of manual fetch with FormData
- **MODIFIED**: Server entry point to remove the HTTP upload route
- **REMOVED**: Manual `storageClient.upload()` function in favor of oRPC client

## Impact

- Affected specs: `storage` (new capability)
- Affected code:
  - `apps/server/src/handlers/upload.ts` (removed)
  - `apps/server/src/routers/index.ts` (add storage router)
  - `apps/server/src/routers/common/storage.ts` (new)
  - `apps/server/src/index.ts` (remove HTTP route)
  - `apps/web/src/utils/storage.ts` (refactor to use oRPC)

## Benefits

1. **Type Safety**: End-to-end type safety from client to server
2. **Consistency**: Same API pattern as all other endpoints
3. **Simpler Client**: No need for manual FormData construction
4. **Validation**: Zod schema validation on both client and server
5. **Error Handling**: Unified error handling through oRPC

## Non-Goals

- Changing the file serving endpoint (`GET /api/storage/*`) - this remains HTTP for caching/CDN compatibility
- Adding chunked or resumable uploads
- Changing the underlying storage provider (R2)
