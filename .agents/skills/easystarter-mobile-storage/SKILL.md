---
name: easystarter-mobile-storage
description: Configure Cloudflare R2 storage for EasyStarter Mobile. Use whenever the user mentions mobile file upload, avatar upload, image picker, R2 storage, native storage, profile picture, or says "configure mobile storage", "set up file upload", "fix avatar upload", "storage not working on device".
---

# EasyStarter Mobile Storage

Mobile file storage goes through the server's oRPC storage router -- the native app never talks to R2 directly. The flow is: pick a file with `expo-image-picker`, upload it via the authenticated storage API, and get back a public URL. The storage config in `packages/app-config/src/app-config.ts` controls allowed MIME types, max file sizes, and key prefixes for both web and native.

## Decision Tree

- **Enable/disable storage** -> Section 1 (config switch)
- **Configure R2 bucket** -> Section 2 (Cloudflare bindings)
- **Fix upload failing on device** -> Section 4 (server URL + auth)
- **Change allowed file types or sizes** -> Section 5 (config)

## Section 1: Storage Config

Storage is enabled via a single flag in `packages/app-config/src/app-config.ts`:

```typescript
// packages/app-config/src/app-config.ts — common.storage
storage: {
  enabled: true,
  provider: "r2",            // Active storage provider
  publicPath: "/api/storage",
  keyPrefixes: {
    avatar: "avatars",
    attachment: "attachments",
  },
  fallbackPrefix: "files",
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

The native app reads `storageEnabled` from `apps/native/configs/app-config.ts`:

```typescript
// apps/native/configs/app-config.ts
storageEnabled: commonConfig.storage.enabled ?? false,
```

## Section 2: R2 Bucket Binding (Default Provider)

The R2 bucket is bound in `apps/server/wrangler.jsonc`:

```jsonc
// apps/server/wrangler.jsonc
"r2_buckets": [
  {
    "binding": "STORAGE",
    "bucket_name": "easysaas-bucket"
  }
]
```

The server resolves the provider in `apps/server/src/storage/index.ts`:

```typescript
// apps/server/src/storage/index.ts
if (providerKey === "r2") {
  const provider = createR2StorageProvider({ bucket: storage });
  return provider;
}
```

| Variable | Where | Scope |
|----------|-------|-------|
| `STORAGE` binding | `apps/server/wrangler.jsonc` r2_buckets | Cloudflare binding |
| `R2_PUBLIC_URL` | `apps/server/.dev.vars` | Public URL for serving stored files |

For local development, Wrangler creates a local R2 simulator automatically.

## Section 3: Provider Status

Cloudflare R2 is the only active storage provider. The previous optional provider is preserved under `archive/` for reference and is not loaded by the application.

```typescript
// packages/app-config/src/app-config.ts
storage: {
  provider: "r2",
},
```

| Variable | Where | Scope |
|----------|-------|-------|
| `ALIYUN_OSS_REGION` | `apps/server/.dev.vars` | e.g. `oss-cn-hangzhou` |
| `ALIYUN_OSS_ENDPOINT` | `apps/server/.dev.vars` | e.g. `oss-cn-hangzhou.aliyuncs.com` |

## Section 4: Native Upload Flow

Native uploads use `expo-image-picker` to select files, then POST to the server storage API. The upload is authenticated -- the user must be signed in.

The image picker permission is configured in `apps/native/app.json`:

```json
// apps/native/app.json — plugins
["expo-image-picker", {
  "photosPermission": "Allow $(PRODUCT_NAME) to access your photos so you can update your profile picture."
}]
```

Key files:
- `apps/native/lib/storage/upload.ts` -- upload helper
- `apps/native/lib/image-picker/image-picker.ts` -- image picker wrapper
- `apps/native/app/(tabs)/(profile)/edit-profile.tsx` -- avatar upload UI

On physical devices, the server URL must be reachable (not `localhost`). Use ngrok or the deployed server URL.

## Section 5: Customizing File Rules

To change allowed types or sizes, edit the `storage.allowedTypes` and `storage.maxFileSizes` objects in `packages/app-config/src/app-config.ts`. Both web and native use the same config, validated server-side.

The server storage router reads these limits from `@repo/app-config/storage` via shared helpers:

```typescript
// apps/server/src/storage/index.ts — re-exports from app-config
export {
  getAllowedFileTypes,
  getMaxFileSize,
  isAllowedFileSize,
  isAllowedFileType,
} from "@repo/app-config/storage";
```

## Verification

1. `pnpm dev:native+server`
2. Sign in, navigate to profile edit
3. Tap the avatar, select a photo from the library
4. Confirm the upload completes and the new avatar displays
5. `pnpm check-types` after config changes

## Common Mistakes

- **Forgetting `R2_PUBLIC_URL` in `.dev.vars`** -- uploads succeed but returned URLs are broken because the public URL prefix is empty.
- **Testing on physical device with `localhost` server URL** -- the device cannot reach `localhost`. Use ngrok or the deployed server.
- **Adding a new MIME type to config but not to the server CORS/handler** -- the shared config is the single source of truth. Just add to `allowedTypes` in `app-config.ts` and both web and native pick it up.
- **Image picker permission string not set** -- iOS requires the `photosPermission` key in `app.json` under the `expo-image-picker` plugin, or the system permission dialog shows a blank reason.
