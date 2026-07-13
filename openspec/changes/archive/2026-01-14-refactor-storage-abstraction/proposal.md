# Change: Refactor Storage to Provider-Agnostic Abstraction with Form Upload

## Status: COMPLETED

## Why
The original storage implementation had two limitations:
1. **Tightly coupled to R2** - Made it difficult to switch providers (S3, GCS, local) or test without R2
2. **Only supported base64 RPC upload** - No standard form-based upload for web clients

## What Changed

### Backend (`apps/server`)
- Created `StorageProvider` interface for provider-agnostic storage
- Implemented `R2StorageProvider` as the default provider
- Added HTTP endpoints for file operations (removed oRPC storage router):
  - `POST /api/storage/upload` - Form-based file upload
  - `GET /api/storage/*` - File download/serving
- Created comprehensive documentation in `lib/storage/docs/README.md`

### Frontend (`apps/web`)
- Created `storageClient` utility for type-safe storage operations
- Includes file validation, upload function, and helper utilities

## Files Created/Modified

### New Files
- `apps/server/src/lib/storage/types.ts` - StorageProvider interface
- `apps/server/src/lib/storage/providers/r2.ts` - R2 implementation
- `apps/server/src/lib/storage/providers/index.ts` - Provider exports
- `apps/server/src/lib/storage/docs/README.md` - Documentation
- `apps/server/src/handlers/storage.ts` - File serve handler
- `apps/server/src/handlers/upload.ts` - Form upload handler
- `apps/web/src/utils/storage.ts` - Frontend storage client

### Modified Files
- `apps/server/src/lib/storage/index.ts` - Updated exports
- `apps/server/src/lib/storage/storage.ts` - Refactored to use provider
- `apps/server/src/lib/context.ts` - Uses StorageService
- `apps/server/src/index.ts` - Added HTTP routes
- `apps/server/src/routers/index.ts` - Removed storage router

### Deleted Files
- `apps/server/src/routers/common/storage.ts` - oRPC router removed

## API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/storage/upload` | POST | Upload files (multipart/form-data) |
| `/api/storage/*` | GET | Download/serve files |

## Impact
- Zero breaking changes for file serving (URLs remain the same)
- Upload method changed from oRPC to HTTP form upload
- Users can now implement custom storage providers by following the interface
