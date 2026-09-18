## 1. Implementation
- [x] Create `packages/api-client` with typed oRPC client factory and shared query client helpers.
- [x] Export API router types from the client package to remove app-relative imports.
- [x] Update `apps/web/src/utils/orpc.ts` to use the client package.
- [x] Update `apps/native/utils/orpc.ts` to use the client package with native auth headers.

## 2. Documentation
- [x] Add usage notes for the client package (README or existing docs).

## 3. Validation
- [x] Run `pnpm check-types --filter @repo/api-client --filter web --filter native`.
