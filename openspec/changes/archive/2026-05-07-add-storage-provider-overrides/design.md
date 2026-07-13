## Context
Storage provider selection is currently global via `resolveCommonConfig().storage.provider`. That works when every upload shares one backend, but it cannot support a dashboard page that must write to Aliyun OSS while profile avatars or other product uploads remain on R2.

The server also serves uploaded objects through `/api/storage/*`. If an upload writes to Aliyun OSS but the public URL does not encode that provider choice, later reads and deletes can resolve against the wrong backend.

## Goals / Non-Goals
- Goals:
  - Allow selected upload calls to target `r2` or `aliyun-oss`.
  - Preserve current default behavior for callers that do not specify a provider.
  - Make returned URLs self-describing enough for serve/delete to choose the correct provider.
  - Keep provider validation server-side and constrained to supported provider keys.
- Non-Goals:
  - Do not add a UI provider picker.
  - Do not migrate existing objects between R2 and Aliyun OSS.
  - Do not remove R2 bindings or Aliyun OSS configuration.

## Decisions
- Decision: Add `provider?: StorageProviderKey` to the upload input schema.
- Decision: Add a provider override argument to `getStorageProvider()`, falling back to `resolveCommonConfig().storage.provider`.
- Decision: Include provider in generated public storage URLs using `/api/storage/{provider}/{key}`.
- Decision: Continue accepting legacy `/api/storage/{key}` URLs and route them to the default provider for backward compatibility.
- Decision: Make delete parse provider-scoped URLs so deletion targets the object backend used by the upload.

## Risks / Trade-offs
- Provider-scoped URLs slightly change the public URL shape for new uploads.
- Existing unscoped URLs remain supported, but they can only resolve against the default provider.
- Switching the global default provider affects all upload callers that omit the override, so the implementation should set the global default back to R2 before making the OSS page explicit.

## Migration Plan
- Restore the default configured storage provider to R2.
- Update new uploads to return provider-scoped URLs.
- Keep legacy unscoped URL parsing for existing files.
- Update the Aliyun OSS dashboard page to pass `provider: "aliyun-oss"`.
