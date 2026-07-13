## Context
The repository already has a unified static config source in `@repo/app-config`, but payment and storage helpers remain in separate packages that simply project config values or shared logic from that source.

## Decision
Move payment and storage helper APIs into `@repo/app-config` as subpath modules:
- `@repo/app-config/payments`
- `@repo/app-config/storage`

No compatibility wrapper packages are retained. All internal imports are migrated in one step.

## Rationale
- Keeps configuration APIs in one package boundary.
- Eliminates duplicate package management overhead.
- Maintains clear domain entry points via subpath exports.

## Risks
- Import path regressions during one-shot migration.
- Missed package dependency cleanup in app manifests.

## Mitigations
- Replace imports using repo-wide search.
- Run full TypeScript checks after migration.
