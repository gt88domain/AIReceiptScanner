---
name: easystarter-web-storage
description: Configure Cloudflare R2 storage for EasyStarter Web. Use when the user mentions file upload, avatar upload, R2 bucket, Cloudflare R2, storage setup, file storage, MIME types, file size limits, storage provider, R2_PUBLIC_URL, STORAGE binding, profile photo upload, attachment upload, or asks "how do I set up storage", "configure R2", "file upload not working", or "change upload limits".
---

# EasyStarter Web Storage

Storage uses Cloudflare R2 as the default provider, bound to the server Worker via `wrangler.jsonc`. The storage system has two upload purposes: **avatars** (profile images, 5MB max) and **attachments** (documents, 25MB max). Each has separate MIME type and size restrictions configured in app-config. Files are served through the server API at `/api/storage`, not directly from R2.

## Decision Tree

- **Set up R2 storage from scratch** -> Section 1 (create bucket) + Section 2 (env vars) + Section 3 (config)
- **Change allowed file types or size limits** -> Section 3 (app-config storage)
- **Fix "file upload not working"** -> Section 5 (common mistakes)
- **Use R2 public URL for production** -> Section 2 (R2_PUBLIC_URL)

## Section 1: Create the R2 Bucket

```bash
# Create the bucket (name must match wrangler.jsonc bucket_name)
pnpm wrangler r2 bucket create easysaas-bucket
```

The binding is already configured in `apps/server/wrangler.jsonc`:

```jsonc
// apps/server/wrangler.jsonc
"r2_buckets": [
  {
    "binding": "STORAGE",
    "bucket_name": "easysaas-bucket"
  }
]
```

The server code accesses the bucket via `env.STORAGE` (the binding name). After changing bindings, regenerate Worker types:

```bash
pnpm -F server cf-typegen
```

## Section 2: Environment Variables

| Variable | Where | Scope | Purpose |
|----------|-------|-------|---------|
| `R2_PUBLIC_URL` | `apps/server/.dev.vars` + `.env.production` | Secret/Config | Base URL for serving stored files publicly |

**Development**: Use the R2.dev URL (auto-assigned by Cloudflare, rate-limited):
```
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

**Production**: Use a custom domain pointed at the R2 bucket for better performance and no rate limits. Configure this in the Cloudflare dashboard under R2 -> your bucket -> Settings -> Custom Domains.

The `STORAGE` R2 binding is configured in `wrangler.jsonc` (not an env var). It is automatically available in the Workers runtime.

## Section 3: Storage Config in App-Config

All storage settings are centralized in `packages/app-config/src/app-config.ts`:

```typescript
// packages/app-config/src/app-config.ts
storage: {
  enabled: true,            // Controls storage-backed UI entry points
  provider: "r2",           // Active storage provider
  publicPath: "/api/storage", // API path for serving files
  keyPrefixes: {
    avatar: "avatars",       // R2 key prefix for avatar uploads
    attachment: "attachments", // R2 key prefix for attachment uploads
  },
  fallbackPrefix: "files",   // Used when purpose-specific prefix is unavailable
  allowedTypes: {
    avatar: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    attachment: [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf", "text/plain",
    ],
  },
  maxFileSizes: {
    avatar: 5 * 1024 * 1024,       // 5 MB
    attachment: 25 * 1024 * 1024,   // 25 MB
  },
},
```

**To add a new file type**: add the MIME string to the appropriate `allowedTypes` array.

**To change size limits**: edit the `maxFileSizes` values (in bytes).

**To disable storage entirely**: set `enabled: false`. Storage UI elements disappear, but the provider code stays intact.

## Section 4: How Storage Provider Resolution Works

The server resolves the storage provider at runtime based on the config:

```typescript
// apps/server/src/storage/index.ts
export function getStorageProvider({
  storage, provider,
}: StorageProviderOptions): StorageProvider {
  const providerKey = resolveStorageProviderKey(provider);
  if (providerKey === "r2") {
    return createR2StorageProvider({ bucket: storage });
  }
}
```

The R2 provider wraps the `R2Bucket` binding with the `StorageProvider` interface (put, get, head, list, delete).

File validation (MIME type, size) uses shared helpers from `@repo/app-config/storage`:
- `isAllowedFileType(purpose, contentType)` -- checks against `allowedTypes`
- `isAllowedFileSize(purpose, size)` -- checks against `maxFileSizes`
- `getPublicUrl(key)` -- generates the public-facing URL via `publicPath`

## Verification

1. Ensure the R2 bucket exists: `pnpm wrangler r2 bucket list`
2. Set `R2_PUBLIC_URL` in `apps/server/.dev.vars`
3. `pnpm dev:web+server`
4. Navigate to Settings -> Profile
5. Upload an avatar image -- it should upload and display
6. Check server console for storage errors

## Common Mistakes

- **Forgetting to create the R2 bucket** -- The Worker binding references a bucket by name. If the bucket does not exist, all storage operations fail with an R2 binding error.
- **Missing `R2_PUBLIC_URL` env var** -- Without this, the server cannot construct public URLs for stored files. Uploads succeed but files are not accessible.
- **Hard-coding MIME types in components** -- Web components should use `getAcceptString("avatar")` from `@repo/app-config/storage`, not hard-coded `accept="image/*"`. Hard-coded types drift out of sync with the config.
- **Changing `binding` name without regenerating types** -- After changing the R2 binding name in `wrangler.jsonc`, run `pnpm -F server cf-typegen` to update the Worker type definitions.
- **Using R2.dev URL in production** -- The auto-assigned `pub-xxxx.r2.dev` URL is rate-limited. Use a custom domain in production.
- **Confusing storage provider with bucket binding** -- `provider: "r2"` in app-config selects the provider code path. The `STORAGE` binding in `wrangler.jsonc` gives the Worker access to the actual bucket. Both must be configured.
