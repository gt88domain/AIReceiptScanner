# Template governance and Devtools fixes

Status: implementation and core-goal review passed; focused checks authored but not run

## Core goal

Fix two verified, product-independent EasyStarter defects without changing any
downstream repository or introducing product configuration:

1. automated squash merging must skip upstream-adoption PRs; and
2. production Web builds must not load the TanStack Devtools UI.

## Acceptance criteria

- A PR touching `.template/source.json` or carrying the `upstream-adoption`
  label is never merged by the squash auto-merge workflow.
- Ordinary verified PRs and generated Release Please PRs retain their current
  squash behavior.
- Development keeps TanStack Query and Router Devtools available through a
  development-only dynamic import.
- Production has no reachable import of the three Devtools packages.
- No auth, payment, database, migration, provider, product module, downstream
  repository, deployment, or external resource changes.

## Implementation phases

1. **Governance workflow** — add one fail-closed adoption guard to
   `.github/workflows/auto-merge.yml`.
2. **Web development tooling** — move the Devtools implementation behind a
   development-only dynamic import and keep the root route product-neutral.
3. **Core-goal review** — inspect the complete diff against the acceptance
   criteria and architecture boundaries before adding checks.
4. **Deferred test authoring** — extend the smallest existing workflow
   self-check and add one focused source/bundle guard only if it provides a
   stable signal.

## Deferred test plan

| Behavior | Edge or trust boundary | Expected check | Recommended command | Status |
| --- | --- | --- | --- | --- |
| Adoption PR skips squash automation | Path detection and label detection both fail closed | Extended `scripts/check-auto-merge-sha.mjs` source assertions | `node scripts/check-auto-merge-sha.mjs` | Authored, not run |
| Ordinary PR keeps squash behavior | Adoption guard must not replace the existing merge call | Same focused source assertion | `node scripts/check-auto-merge-sha.mjs` | Authored, not run |
| Production excludes Devtools | Development import must be compile-time unreachable in production | `apps/web/scripts/check-production-devtools.mjs` checks source and built assets | `pnpm --filter web build && node apps/web/scripts/check-production-devtools.mjs` | Authored, not run |
| Development retains Devtools | Dynamic module remains importable in development | Focused local browser check | `pnpm dev:web` | Planned |

## Status

- Implementation: complete
- Core-goal review: passed — only the two product-independent upstream defects changed
- Test authoring: complete for the stable workflow and production-bundle signals
- Test execution: not run; requires explicit user request
