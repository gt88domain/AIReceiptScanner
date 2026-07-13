## Context
The storage system currently uses Cloudflare R2 directly via the `R2Bucket` type. While R2 is excellent for production on Cloudflare Workers, the tight coupling prevents:
- Using alternative providers (S3, GCS, MinIO, local filesystem)
- Easy testing with mock implementations
- Gradual migration between providers

Additionally, the current upload mechanism only supports base64-encoded data via RPC, which is inefficient for large files and doesn't support standard HTML form uploads.

## Goals / Non-Goals
- **Goals:**
  - Define a provider-agnostic storage interface that users can implement
  - Provide R2 provider as the default (works out of the box)
  - Add form-based upload endpoint for standard multipart/form-data
  - Enable easy provider swapping by implementing the interface
  - Maintain full type safety
  - Zero breaking changes to existing API routes

- **Non-Goals:**
  - Implementing additional providers (S3, local, etc.) - users implement as needed
  - Changing the existing RPC upload API (kept for backward compatibility)
  - Adding presigned URL support (R2 Workers limitation)

## Decisions

### Decision 1: Interface-based abstraction
Use TypeScript interfaces to define the storage contract rather than abstract classes.

**Rationale:**
- Lighter weight, no runtime overhead
- Better fits the functional style of the codebase
- Easier for users to implement custom providers

### Decision 2: Provider interface design
```typescript
interface StorageProvider {
  put(key: string, data: StorageData, options?: PutOptions): Promise<StorageObject>
  get(key: string): Promise<StorageObjectBody | null>
  head(key: string): Promise<StorageObjectMeta | null>
  delete(key: string): Promise<void>
}
```

**Rationale:**
- Minimal interface covering actual usage
- Maps cleanly to R2, S3, and other object storage APIs
- Users only need to implement 4 methods for a custom provider

### Decision 3: R2 as default, user-extensible
R2StorageProvider is the default. Users can swap by:
1. Implementing `StorageProvider` interface
2. Passing their provider to the storage service

**Rationale:**
- Works out of the box for Cloudflare deployments
- No configuration needed for default case
- Clear extension point for custom providers

### Decision 4: Form upload via Hono endpoint
Add `POST /api/storage/upload` endpoint using Hono's built-in multipart parsing.

```typescript
app.post('/api/storage/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  const purpose = formData.get('purpose') as string
  // validate, generate key, upload via provider
})
```

**Rationale:**
- Standard HTML form compatibility
- Streaming support for large files
- Works with any HTTP client

### Decision 5: Keep validation utilities separate
File type/size validation and key generation remain as standalone utilities, not part of the provider interface.

**Rationale:**
- These are business logic, not storage operations
- Keeps provider implementations simple
- Allows different validation rules per use case

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Abstraction may not cover all R2 features | Start minimal, extend interface as needed |
| Performance overhead from abstraction | Interface is thin, no significant overhead |
| Form upload memory usage | Use streaming where possible |

## Migration Plan
1. Add new interface and types (non-breaking)
2. Create R2 provider implementing interface
3. Update `createStorageService` to use provider
4. Update context to create provider from R2Bucket
5. Add form upload endpoint
6. Verify all existing functionality works unchanged

**Rollback:** Revert to direct R2Bucket usage if issues arise.

## Open Questions
- None - requirements are clear
