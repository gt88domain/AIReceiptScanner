## Context
Payments configuration and policy helpers are currently exported through a single `@repo/app-config/payments` entrypoint. Web/server domains consume most of these exports today, while native provider configuration is a separate concern.

## Goals / Non-Goals
- Goals:
  - Make platform boundaries explicit through package subpaths.
  - Keep existing web/server payment behavior unchanged.
  - Provide native-specific config normalization APIs for future native billing flows.
- Non-Goals:
  - Introducing native billing APIs in server routers.
  - Changing Stripe or RevenueCat runtime integrations.
  - Altering existing plan catalog values.

## Decisions
- Add `./payments/web` and `./payments/native` subpath exports in `@repo/app-config`.
- Remove `./payments` root subpath export (breaking by design).
- Rename and reorganize source files under `packages/app-config/src/payments`:
  - `server.ts` -> `web.ts`
  - `policy.ts` -> `web-policy.ts`
- Keep policy logic in web module scope, exported from `payments/web`.
- Extend `payments/native` with:
  - `NativePaymentsConfig`
  - `defineNativePaymentsConfig`
  - `normalizeNativePaymentsConfig`
  - `nativePaymentsConfig`

## Risks / Trade-offs
- Risk: import-path regressions during one-shot migration.
  - Mitigation: repo-wide search and full typecheck.
- Trade-off: breaking old root import path immediately.
  - Rationale: enforces the platform split and avoids dual-path maintenance.

## Migration Plan
1. Add new subpath exports and payments module files.
2. Replace all code imports from `@repo/app-config/payments` to `@repo/app-config/payments/web`.
3. Remove obsolete root payments entrypoint file/export.
4. Update docs and add spec deltas.
5. Run full TypeScript checks and fix issues.

## Open Questions
- None.
