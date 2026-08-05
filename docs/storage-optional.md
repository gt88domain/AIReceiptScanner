# Optional Storage

Storage is enabled by `common.storage.enabled` in
`packages/app-config/src/product-config.ts`; it must match the resolved Storage
feature. When it is disabled, the request context does not read `STORAGE`, no
provider is created, and `GET /api/storage/*` is not registered. Storage RPC
operations fail closed with `FEATURE_DISABLED` rather than pretending an upload
succeeded.

When Storage is enabled, Wrangler is the source of the real R2 binding identity.
Use an Asset record and authorization policy for product files; do not turn a raw
storage key into a public authorization decision. The legacy avatar delivery
route remains constrained to its configured prefix.

No-storage products do not need an R2 binding or an R2 production-preflight
value. A residual R2 binding is a warning, not an implicit activation.
