# Change: Add shared API client package

## Why
Web and native clients duplicate oRPC client setup and the native app imports router types from a server-relative path, which risks drift and brittle coupling.

## What Changes
- Add a workspace package `@repo/api-client` that exports a typed oRPC client factory and shared TanStack Query defaults.
- Export API router types from the shared package to avoid app-to-app imports.
- Update web and native clients to use the shared client package.

## Impact
- Affected specs: api-client (new)
- Affected code: `apps/web/src/utils/orpc.ts`, `apps/native/utils/orpc.ts`, `apps/server/src/routers/index.ts`, `packages/api-client/*`
