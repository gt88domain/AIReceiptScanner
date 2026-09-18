## Context

Config values used by server and web are spread across multiple modules and packages, even when they describe the same domain behavior. This causes drift and makes updates harder.

## Goals / Non-Goals

- Goals:
  - Introduce one typed config source for cross-platform business configuration.
  - Keep existing runtime behavior the same.
  - Preserve domain package APIs while changing internal source of truth.
- Non-Goals:
  - Secret management redesign.
  - Unifying web UI/theme/data-table settings.

## Decisions

- Decision: Create `@repo/app-config` package with `appConfig` and `defineAppConfig`.
- Decision: Add `buildServerConfig` and `buildWebUrls` runtime composition helpers.
- Decision: Keep `@repo/payments-config` and `@repo/storage-config` as domain-facing APIs, but read values from `appConfig`.
- Decision: Keep secrets outside `appConfig` and continue using environment-based secret injection.

## Risks / Trade-offs

- Risk: Type drift between unified config and domain package contracts.
  - Mitigation: Type-check at integration points (`satisfies` and shared literal unions).
- Risk: Broad one-shot migration can surface hidden import coupling.
  - Mitigation: run repo-wide typecheck/build after migration.

## Migration Plan

1. Add `@repo/app-config` package and default config object.
2. Switch server/web runtime config composition to builders from `@repo/app-config`.
3. Switch payments/storage internal defaults to source from `appConfig`.
4. Replace deep dist import in DB schema with package export import.
5. Validate with typecheck and build.

## Open Questions

- None.
