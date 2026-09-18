# Template runtime hardening plan

Status: focused verification passed; GitHub Actions pending

## Core goal

Make the built Cloudflare Web Worker use the repository's custom server entry,
so security headers and private-route no-index behavior exist in the deployed
bundle rather than only in source. Keep the hosted template preview useful for
anonymous browsing while making every preview API write impossible.

## Observable acceptance criteria

- The built Web server entry contains the custom CSP and `X-Robots-Tag`
  response handling.
- The preview API answers only the anonymous session/current-user reads needed
  by the preview UI, with an exact allowed origin and explicit preflight.
- Every other preview API path remains a read-only `404`.
- Unknown Web routes and disabled Contact return real `404` responses.
- Fingerprinted assets may be cached immutably without caching HTML or API
  responses.
- No preview or production deploy, secret change, D1 operation, or downstream
  repository change is included.

## Implementation phases

1. Merge the released v3.0 baseline into the existing PR branch and resolve
   only conflicts in files already owned by this change.
2. Review the aggregate diff against the core goal, current Web/Worker entry
   conventions, architecture boundaries, and the actual built-entry risk.
3. After the core review passes, update the branch's existing focused tests and
   self-checks together if v3.0 changed their expected behavior.
4. Run the user-authorized focused checks, then the existing GitHub Actions
   release gates. Keep the PR draft until all required checks pass.

## Deferred test plan

- Server preview handler: anonymous session/current-user allow paths, exact
  CORS/preflight behavior, and write denial.
- Built Web entry: fail if CSP or private-route no-index handling disappears.
- Preview smoke checker: real unknown-route `404`, anonymous reads, immutable
  asset headers, and write denial.
- Existing route tests: unknown and disabled routes remain real `404`s after
  conflict resolution.

## Status record

- Implementation: complete and reconciled with the released v3.0 baseline.
- Core-goal review: passed against the acceptance criteria, architecture
  boundaries, and aggregate diff from `origin/main`.
- Test authoring/update: complete; the focused server test now proves that a
  foreign origin never receives an allow-origin response header.
- Test execution: passed locally on 2026-08-28:
  - `pnpm --filter server exec tsx --test src/template-preview.test.ts`
    (1/1 passed)
  - `pnpm --filter web exec vitest run src/configs/publication-paths.test.ts`
    (4/4 passed)
  - `pnpm --filter web build` (passed, including the built-entry assertion)
  - `pnpm docs:facts-check` (repository facts and module TODO checks passed)
- GitHub Actions: pending the reconciled branch push.
