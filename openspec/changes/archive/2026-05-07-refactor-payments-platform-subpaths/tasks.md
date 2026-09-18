## 1. Implementation
- [x] 1.1 Add `@repo/app-config/payments/web` and `@repo/app-config/payments/native` subpath exports.
- [x] 1.2 Refactor payments source files to explicit web/native module boundaries.
- [x] 1.3 Migrate all server and web imports away from `@repo/app-config/payments` root path.
- [x] 1.4 Add native payments normalization APIs under `payments/native`.
- [x] 1.5 Remove `@repo/app-config/payments` root entrypoint export.
- [x] 1.6 Update config architecture docs for new payments subpaths.

## 2. Validation
- [x] 2.1 Run repository-wide TypeScript check and resolve all type errors.
