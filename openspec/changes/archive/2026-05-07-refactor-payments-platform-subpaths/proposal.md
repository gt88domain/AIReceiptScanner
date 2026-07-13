# Change: Refactor payments config into platform subpaths

## Why
`@repo/app-config/payments` currently mixes web/server and native payment semantics behind one entrypoint. This weakens platform boundaries and makes it harder to evolve each side independently.

## What Changes
- Add explicit platform subpath exports:
  - `@repo/app-config/payments/web`
  - `@repo/app-config/payments/native`
- Move web-facing payment exports (plans, normalization, policy, statuses) to `payments/web`.
- Expand native module with its own typed plans config and normalization helpers in `payments/native`.
- Remove root payments subpath export `@repo/app-config/payments`.
- Migrate all server/web imports to the new web subpath.
- Update architecture docs to describe the new subpath usage.

## Impact
- Affected code:
  - `packages/app-config/*`
  - `apps/server/src/payments/*`
  - `apps/server/src/db/schema/payments.ts`
  - `apps/server/src/routers/web/payments.ts`
  - `apps/web/src/lib/payments/*`
  - `docs/config-architecture.md`
- Breaking scope: internal monorepo imports that still use `@repo/app-config/payments`.
