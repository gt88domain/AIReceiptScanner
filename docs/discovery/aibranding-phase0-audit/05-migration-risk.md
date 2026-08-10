# AIBranding Phase 0 — Migration and Deployment Risk

## Migration position

No migration is proposed, generated, applied, or repaired by this audit.

The live production D1 migration ledger records the complete AIBranding
catalogue chain `0000` through `0016`, including downstream catalogue,
favourites, inquiry, and domain-audit migrations. The repository contains
those SQL files, while its Drizzle metadata journal ends at `0010`. This is a
provenance/reproducibility risk that must be audited before any future fresh-D1
or migration work; it is not permission to reconstruct or rewrite history.

## Deployment topology

| Surface | Current identity | Phase 0 finding |
| --- | --- | --- |
| Production Web | `aibranding-next-web` / `aibranding.com` | Live and serving public pages. |
| Production API | `aibranding-next-server` / `api.aibranding.com` | Live and serving health/API traffic. |
| Production D1 | `aibranding-next-production` / `9cc4bc33-6c55-4ae6-a70f-b6727850b964` | Existing business data; no writes were made. |
| Production R2 | `aibrand` | Existing domain-logo asset bucket. |
| Preview API | `aibranding-upstream-first-v040-server-preview` | Exists, but configuration binds the production D1. |
| Preview Web | `aibranding-upstream-first-v040-preview` | Exists, but configuration points browser API configuration at production. |

## Blocking finding

**`Preview != Production` is false.** The present Preview topology is a
read-only product surface over production data, not an isolated Preview data
environment. It must not be used for migration application, seed runs, write
tests, traffic experiments, or a controlled data Pilot.

An additional provenance gap remains: deployed Worker versions do not carry a
verifiable audited Git SHA, and the latest audited `main` is newer than the
observed Web deployment. Do not represent source review as exact production
release validation.

## Required future decision before a real Adapter Pilot

Choose and approve one safe environment model first:

1. an isolated Preview D1 with a controlled, non-production data strategy; or
2. a strictly read-only source/contract Pilot that has no remote deployment,
   D1 access, R2 access, user traffic, or write path.

That future decision must name data source, identity, rollback/forward-fix
strategy, secret boundary, deployment provenance, and exact test scope. It is
out of scope here.

## Phase 0 gate

| Gate | Status |
| --- | --- |
| Evidence-only Adapter audit | PASS |
| AIBranding Phase 1 Adapter Pilot | BLOCKED pending environment decision and a separate authorization |
| Schema/Migration/Data work | No-Go |
| Production deployment or D1/R2 operation | No-Go |
