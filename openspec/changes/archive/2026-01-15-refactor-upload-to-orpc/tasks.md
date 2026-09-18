## 1. Server-side Implementation

- [x] 1.1 Create `apps/server/src/routers/common/storage.ts` with oRPC storage router
  - Define Zod schema for upload input (file: z.file(), purpose: z.enum(["avatar", "attachment"]))
  - Implement `upload` procedure using `protectedProcedure`
  - Reuse existing validation functions (`isAllowedFileType`, `isAllowedFileSize`, `generateStorageKey`)
  - Return typed response with `url`, `key`, `size`, `contentType`
  - Use `getPublicUrl` to build the public URL

- [x] 1.2 Add `delete` procedure to storage router
  - Accept `{ url: string }` input
  - Use `getKeyFromUrl` to extract key from URL
  - Verify file ownership by checking key prefix matches user ID
  - Return `{ success: boolean }`

- [x] 1.3 Register storage router in `apps/server/src/routers/index.ts`
  - Import `storageRouter` from `./common/storage`
  - Add `storage: storageRouter` to `appRouter`

- [x] 1.4 Remove HTTP upload endpoint from `apps/server/src/index.ts`
  - Remove import of `handleFormUpload`
  - Remove `app.post("/api/storage/upload", handleFormUpload)` route

- [x] 1.5 Delete `apps/server/src/handlers/upload.ts`
  - File is no longer needed after migration to oRPC

- [x] 1.6 Update `StorageData` type to support `Blob`
  - Add `Blob` to union type in `apps/server/src/lib/storage/types.ts`
  - Allows passing `File` directly without `arrayBuffer()` conversion

## 2. Client-side Implementation

- [x] 2.1 Simplify `apps/web/src/utils/storage.ts`
  - Remove `storageClient` object and all unused methods
  - Keep only `getAcceptString` function for file input accept attribute
  - Keep `ALLOWED_TYPES` as private constant

- [x] 2.2 Update profile component to use oRPC
  - Replace `storageClient.upload()` with `client.storage.upload({ file, purpose })`
  - Remove client-side validation (server handles it)
  - Update import to use `getAcceptString` directly

## 3. Verification

- [x] 3.1 Run type checks
  - `pnpm check-types` passes

- [x] 3.2 Run linting
  - `pnpm check` passes
