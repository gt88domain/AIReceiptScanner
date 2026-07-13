## Context
The project separates config into `common`, `web`, and `native`. Shared values are read via `resolveCommonConfig()`, but there is no typed mechanism for platform-specific deviations of shared fields.

## Goals / Non-Goals
- Goals:
  - Allow platform-scoped customization of common values.
  - Keep a single source shape for shared config.
  - Avoid flattening or duplicating `AppCommonConfig` into each platform section.
- Non-Goals:
  - Replacing `common` as the primary shared source.
  - Auto-applying platform common overrides in all existing consumers.

## Decisions
- Define `AppPlatformCommonConfig` as deep-partial of `AppCommonConfig` fields.
- Allow platform configs to directly define common keys (`app`, `auth`, `email`, `storage`) as optional override values.
- Implement deterministic deep merge in app-config package.
- Provide explicit resolver APIs per platform.

## Risks / Trade-offs
- Risk: shallow merge would break nested override expectations.
  - Mitigation: use deep merge for object branches.
- Trade-off: arrays in platform common overrides replace whole arrays rather than merging per element.
  - Rationale: predictable behavior for config collections.

## Migration Plan
1. Add types for platform common overrides and config composition.
2. Add resolver functions with deep merge.
3. Export new types/functions from package root.
4. Document how to use merged common config.
