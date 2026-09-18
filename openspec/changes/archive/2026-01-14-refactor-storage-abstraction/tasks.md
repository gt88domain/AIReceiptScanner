## 1. Define Storage Provider Interface

- [x] 1.1 Create `apps/server/src/lib/storage/types.ts` with:
  - `StorageData` type (ArrayBuffer | ReadableStream | string | Uint8Array)
  - `PutOptions` interface (contentType, customMetadata)
  - `StorageObjectMeta` interface (key, size, etag, httpMetadata, customMetadata)
  - `StorageObjectBody` interface (extends meta, adds body stream)
  - `StorageProvider` interface (put, get, head, delete)

- [x] 1.2 Create `apps/server/src/lib/storage/index.ts` to export all types and providers

## 2. Implement R2 Storage Provider (Default)

- [x] 2.1 Create `apps/server/src/lib/storage/providers/r2.ts`:
  - Implement `R2StorageProvider` class implementing `StorageProvider`
  - Map R2-specific types (R2Object, R2ObjectBody) to generic types
  - Handle R2Bucket binding

- [x] 2.2 Create `apps/server/src/lib/storage/providers/index.ts` to export providers

## 3. Refactor Storage Service

- [x] 3.1 Update `apps/server/src/lib/storage/storage.ts`:
  - Import `StorageProvider` interface
  - Update `createStorageService` to accept `StorageProvider` instead of `R2Bucket`
  - Keep validation utilities unchanged (isAllowedFileType, isAllowedFileSize, etc.)

## 4. Update Context Integration

- [x] 4.1 Update `apps/server/src/lib/context.ts`:
  - Import R2StorageProvider and createStorageService
  - Create R2StorageProvider instance from `context.env.STORAGE`
  - Create and expose StorageService in context
  - Update Context type

## 5. Add Form Upload Endpoint

- [x] 5.1 Create form upload handler in `apps/server/src/handlers/upload.ts`:
  - Parse multipart/form-data using Hono's `c.req.formData()`
  - Extract file and purpose from form data
  - Validate file type and size
  - Generate storage key
  - Upload via storage service
  - Return JSON response with file URL

- [x] 5.2 Update `apps/server/src/index.ts`:
  - Add `POST /api/storage/upload` route
  - Add `GET /api/storage/*` route for file serving

## 6. File Serving Endpoint

- [x] 6.1 Create file serve handler in `apps/server/src/handlers/storage.ts`:
  - Use storage provider `get` method
  - Set Content-Type from metadata
  - Set Cache-Control headers (1 day for avatars, 1 hour for others)
  - Set ETag for cache validation

## 7. Documentation

- [x] 7.1 Create `apps/server/src/lib/storage/docs/README.md`:
  - Architecture overview
  - API endpoints documentation
  - Custom provider implementation guide
  - File validation rules
  - Usage examples

## 8. Frontend Storage Client

- [x] 8.1 Create `apps/web/src/utils/storage.ts`:
  - Type-safe storage client
  - File validation utilities
  - Upload function with FormData
  - Helper functions (getUrl, getAcceptString)

## 9. Verification

- [x] 9.1 Run type checking: `pnpm check-types` - PASSED
- [x] 9.2 Run linting: `pnpm check` - PASSED

## Notes

- oRPC storage router was removed per user request (all storage operations use HTTP endpoints)
- Manual testing requires running the dev server with R2 binding configured
