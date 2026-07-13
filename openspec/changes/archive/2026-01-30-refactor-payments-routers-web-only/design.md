## Context
Payments APIs are only consumed by the web app in this template. Keeping them under the shared `common/` router exposes them to native clients unnecessarily.

## Goals / Non-Goals
- Goals:
  - Restrict payments endpoints to web-only routing.
  - Keep web API surface intact for existing web usage.
- Non-Goals:
  - Changing payment behavior or provider integrations.
  - Adding native payment APIs.

## Decisions
- Move `payments` and `paymentsAdmin` routers under `apps/server/src/routers/web/`.
- Expose these routers only under `appRouter.web`.

## Risks / Trade-offs
- **Breaking** for native clients relying on shared payments endpoints; acceptable because native should not consume these APIs.

## Migration Plan
- Update router wiring and imports.
- Update web type usage if necessary.

## Open Questions
- None.
