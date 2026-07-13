# Change: Refactor unified app config

## Why
Configuration is currently split across `apps/server/src/configs`, `@repo/payments-config`, and `@repo/storage-config`, which increases duplication and update risk. We need a single typed source of truth for cross-platform business configuration.

## What Changes
- Add a new package `@repo/app-config` as the single source for non-secret app config.
- Move payments plan catalog and storage validation/path defaults into unified config.
- Build server runtime config from unified config + runtime URL input.
- Build web localized callback URLs from unified config + runtime URL/locale input.
- Update server/web/payments/storage consumers to read from unified config path.
- Keep secrets out of unified config (`.env/.dev.vars/wrangler secret` remains unchanged).

## Impact
- Affected specs: `storage`, `payments`, `config`
- Affected code:
  - `packages/app-config/*`
  - `apps/server/src/configs/*`
  - `apps/web/src/configs/web-config.ts`
  - `packages/payments-config/src/web/web-payment-plans.ts`
  - `packages/storage-config/src/index.ts`
  - `apps/server/src/db/schema/payments.ts`
