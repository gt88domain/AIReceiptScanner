# Documentation refresh plan

Status: complete

Reviewed baseline: `origin/main@21b382a` (`v2.6.0` plus three mainline commits).

## Core goal

Make the maintained documentation describe the repository as it exists now,
give a solo maintainer a reliable repo map, and cover the product lifecycles
that are expensive to reconstruct from source.

## Acceptance criteria

- A current repo map answers where to make common product and platform changes,
  which entry points own each runtime, and which documents are authoritative.
- The architecture guide covers authentication lifecycle, checkout-to-
  entitlement/credits, and billable-operation settlement in addition to its
  existing Worker, webhook, Jobs, and asset flows.
- The root README and maintained how-to documents contain only real scripts,
  paths, workspaces, providers, and deployment safety rules.
- Historical audits, migration records, upgrade notes, and prompts remain
  identifiable as historical evidence rather than current operating guidance.
- Existing unrelated worktree changes are untouched.

## Implementation phases

1. Inventory documentation and compare current-state claims with
   `package.json`, `template-kit/repository-facts.json`, Worker configuration,
   and source entry points.
2. Add `docs/repo-map.md` and complete the missing critical Mermaid sequences
   in `docs/architecture-map.md`.
3. Repair current maintained entry documents and their navigation.
4. Review the resulting diff against the acceptance criteria and separate
   current guidance from historical records.

## Deferred test and verification plan

This is documentation-only work, so no automated test files are planned.
After implementation review, the recommended verification commands are:

- `pnpm docs:facts-check`
- `pnpm exec oxfmt --check` for changed Markdown files
- Mermaid parser validation for every changed diagram
- `git diff --check`

Per repository instructions, these commands are recorded but will not be run
unless the user explicitly requests automated verification.

## Review status

- Implementation review: complete; current entry points, scripts, configuration
  owners, providers, mobile workspace behavior, and production secret inputs
  were reconciled with source and package scripts.
- Test authoring: not applicable; documentation-only
- Verification execution: authorized later and passed in PR #115 through
  `pnpm docs:facts-check`, repository formatting/type/test/build gates, Mobile,
  and OSV.

## Review result

- The maintained repo map is intent-based and explicitly rejects generated
  CodeGraph/symbol dumps as a second source of truth.
- The architecture guide now contains three structural flowcharts and eight
  critical sequence diagrams.
- Current operating docs were repaired; dated audits, rollout notes, migration
  records, prompts, candidates, and upgrade instructions remain available but
  are classified as historical or task-specific evidence.
- No unrelated prompt or candidate worktree changes were modified.
