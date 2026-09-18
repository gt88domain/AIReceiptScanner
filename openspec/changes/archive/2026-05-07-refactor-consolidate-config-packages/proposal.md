# Change: Consolidate config packages into app-config

## Why
`@repo/payments-config` and `@repo/storage-config` duplicate the same package-level configuration pattern that already depends on `@repo/app-config`. Keeping them as standalone packages scatters config APIs and increases maintenance overhead.

## What Changes
- Consolidate payment and storage config helpers into `@repo/app-config` subpath exports.
- Add `@repo/app-config/payments` and `@repo/app-config/storage` entry points.
- Migrate all app imports from `@repo/payments-config` and `@repo/storage-config` to new `@repo/app-config` subpaths.
- Remove legacy `packages/payments-config` and `packages/storage-config` packages.
- Update architecture docs to reflect the unified import strategy.

## Impact
- Affected code:
  - `packages/app-config/*`
  - `apps/server/*`
  - `apps/web/*`
  - `docs/config-architecture.md`
- Breaking scope: internal monorepo imports only (no external compatibility layer retained).
