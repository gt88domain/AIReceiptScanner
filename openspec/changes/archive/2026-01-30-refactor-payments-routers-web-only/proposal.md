# Change: Make payments routers web-only

## Why
Payments APIs are only used by the web app in this template. Keeping them in the shared `common/` router unnecessarily exposes them to native clients and blurs platform boundaries.

## What Changes
- Move `payments` and `paymentsAdmin` routers from `apps/server/src/routers/common` to `apps/server/src/routers/web`.
- Expose these routers only under the web router namespace in `appRouter`.
- Update web client imports/usages accordingly.
- **BREAKING**: Native clients will no longer see payments endpoints in the shared router.

## Impact
- Affected code: `apps/server/src/routers/index.ts`, `apps/server/src/routers/common/payments*.ts`, `apps/server/src/routers/web/*`, `apps/web/src/utils/orpc.ts` (type surface), and any web callers.
- Affected capability: Payments API exposure by platform.
