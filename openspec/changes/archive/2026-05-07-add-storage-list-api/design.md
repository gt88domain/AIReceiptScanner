## Context
Uploaded file keys already include the user id:

- `avatars/{userId}/{timestamp}.{ext}`
- `attachments/{userId}/{timestamp}.{ext}`

This gives the server a natural ownership boundary for listing. The current OSS dashboard does not use that boundary and instead stores a browser-local history, which is not account-scoped and is not reliable.

## Goals / Non-Goals
- Goals:
  - Return only files owned by the current authenticated user.
  - Allow listing a specific storage provider (`r2` or `aliyun-oss`).
  - Return enough metadata for the dashboard table: key, URL, size, content type, provider, uploaded time.
  - Remove localStorage upload history from the OSS page.
- Non-Goals:
  - Do not create a database-backed file catalog in this change.
  - Do not implement cross-provider combined listing in one request.
  - Do not expose listing for unauthenticated users.

## Decisions
- Decision: Add `list(prefix?: string, options?: ListOptions)` to the `StorageProvider` interface.
- Decision: `storage.list` will accept optional `provider` and optional `purpose`.
- Decision: The server will derive allowed prefixes from the authenticated user id and shared storage config; callers cannot list arbitrary prefixes.
- Decision: The endpoint will return provider-scoped URLs generated with `getPublicUrl(publicBaseUrl, key, provider)`.

## Risks / Trade-offs
- Listing directly from object storage means there is no custom filename or richer metadata unless stored as object metadata.
- Aliyun OSS and R2 pagination models differ, so the provider interface should expose a small common shape and can add pagination later if needed.
