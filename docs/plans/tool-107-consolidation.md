# TOOL-107 governance consolidation

## Core goal

Reduce always-active governance machinery without deleting rollback evidence or
weakening CI, release, security, product-profile, or upstream-adoption guards.

## Acceptance criteria

- `AGENTS.md` is the sole normative human/agent instruction source.
- Dormant skills remain recoverable but are outside the active skill directory.
- Every retained root script has one named guarded object.
- Release Please creates release PRs and dispatches checks; only
  `auto-merge.yml` decides and performs an automatic merge.
- Repository facts, modification manifests, profile essentials, upstream
  lineage, Fumadocs, Orama, blog, and design-system gallery remain intact.

## Implementation phases

| Phase | Status | Scope |
| --- | --- | --- |
| Authority consolidation | Implemented, review pending | Root instructions, governance pointers, docs index |
| Skill archival | Implemented, review pending | Active EasyStarter skills and recoverable dormant references |
| Script inventory | Implemented, review pending | Explicit guarded-object inventory and duplicate command alias removal |
| Release consolidation | Implemented, review pending | One merge implementation with a release-check dispatch path |
| Core-goal review | Pending | Static review of authority, rollback, and merge behavior |
| Test authoring | Deferred | Update focused workflow source assertions after core review |
| Test execution | Not authorized | No tests, builds, type checks, or workflow runs performed |

## Deferred test plan

After core-goal review passes, update the focused auto-merge checker to prove:

- `auto-merge.yml` is the only workflow containing the merge API call;
- ordinary workflow-run events still require the exact successful head SHA;
- repository dispatch accepts only generated Release Please branches;
- release files remain limited to the three generated accounting files;
- sensitive and upstream-adoption PR exclusions remain fail closed;
- the release dispatch path waits for Quality, OSV, and Mobile when required;
- active skills contain only the documented core set and archived skills remain
  outside active discovery.

Recommended commands, not run:

```sh
node scripts/check-auto-merge-sha.mjs
pnpm docs:facts-check
pnpm test:template
```
