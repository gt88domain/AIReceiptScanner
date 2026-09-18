# Solo paid template hardening plan

Status: implementation review and authorized verification passed; PR merge pending

Reviewed baseline: `origin/main@21b382a` (`v2.6.0` plus three mainline commits),
with documentation checkpoint `00d1dca` on `codex/template-docs-v26`.

Manual change record (maintained without OpenSpec CLI):
[`harden-solo-paid-template-baseline`](../../openspec/changes/harden-solo-paid-template-baseline/)

## Core goal

Finish the mother template as a reliable English-first base for paid products
run by one person. Correct planning data and close concrete launch traps without
starting downstream work or expanding into enterprise account, support,
analytics, staging, or control-plane features.

## Decisions already made

- Every product must have a paid path; the exact payment model remains a
  product adoption decision.
- The paid-product baseline has no automatic signup credit grant or default
  subscription trial. The internal `free` entitlement is only the
  no-paid-entitlement state, not a public free product offer.
- First public launch is English-only. Chinese and Japanese are deferred.
- Downstream HTML5.ai and AIAnswers work is deferred until the template is
  accepted.
- Tickets stays disabled for launch; support uses email.
- Admin Analytics remains because it provides D1 business and operational KPIs.
- Optional Mobile and dormant Assets are not deleted merely because they are
  disabled.
- CodeGraph and generated repo-map snapshots are not used.
- Email OTP is not needed and should be removed end-to-end rather than completed.
- Full staging, account purge/export, active-session UI, 2FA, passkeys, RBAC,
  teams, tax automation, and a central control plane are outside this plan.

## Work packages

| Order | Work package             | Ownership                   | Result                                                                     |
| ----- | ------------------------ | --------------------------- | -------------------------------------------------------------------------- |
| 1     | Planning-data repair     | Documentation/tooling       | Valid 17-column CSV, current paths, no dangling IDs                        |
| 2     | English-only publication | Web platform/product config | Only English routes and SEO metadata are public                            |
| 3     | OTP removal              | Auth core + Web             | Enabled auth methods match complete server behavior                        |
| 4     | Private-route SEO        | Web platform                | One source controls headers, robots, sitemap, prerender                    |
| 5     | Deploy and D1 recovery   | Core operations             | No repository deploy bypass; minimal recovery runbook                      |
| 6     | Evidence-based cleanup   | Web/template                | Only confirmed unused demo files/dependencies removed                      |
| 7     | Core-goal review         | All affected areas          | Owner accepted implementation before tests were written                    |
| 8     | Deferred test authoring  | Focused checks              | Small checks added for CSV, locale/SEO, Auth, paid defaults, deploy safety |
| 9     | Authorized verification  | Release gate                | Commands run only after an explicit user request                           |

Each work package remains a focused change. Core changes must preserve
repository facts and import boundaries. No package may add product behavior to
upstream core.

## Acceptance criteria

- CSV parses with 17 fields per record, unique IDs, no dangling references, and
  current evidence paths.
- Public navigation, routes, sitemap, prerender output, canonical alternates,
  hreflang, legal copy selection, and transactional-language fallback expose
  English only.
- No email OTP configuration or UI suggests a capability absent from the
  server; verified email/password flows remain intact.
- Admin, Tickets, Purchases, Help, and every other private prefix receive
  consistent no-index/sitemap/prerender treatment while server authorization
  remains unchanged.
- Production deploy commands retain the safety preflight; preview uses its
  explicit isolated configuration.
- A current D1 recovery runbook names the owner, mechanism, storage/retention
  decision, and non-production rehearsal procedure.
- Admin Analytics, optional Mobile, Assets, and default-off Tickets are not
  removed without a separate product decision.
- No downstream repository, D1 migration, production resource, secret, deploy,
  or external service is changed.

## Implementation checkpoint and review

Implement work packages 1–6 first. The owner explicitly authorized versioned
Conventional Commits and pushes on `codex/template-docs-v26`, so each work
package may end at a pushed branch checkpoint; every checkpoint remains
undeployed. Review the complete diff against the core goal, decisions,
non-goals, architecture boundaries, and acceptance criteria. Record any
rejected or deferred item in this document rather than silently expanding
scope.

The owner accepted continuation after the review and explicitly asked to avoid
OpenSpec CLI. Test authoring therefore proceeded from the reviewed checkpoint;
the manual plan and task records remain the source of truth for this change.

## Core review record

Review completed on 2026-08-27 against the aggregate feature-branch diff,
`GOVERNANCE.md`, `docs/architecture-boundaries.md`, the baseline audit, and
`template-kit/repository-facts.json`.

- Core goals are present: English-only publication, complete email/password
  Auth with OTP removed, shared private-route indexing, guarded deploy entry
  points, current D1 recovery guidance, accurate planning data, and bounded
  demo/dependency cleanup.
- The paid-product decision is now executable rather than only documentary:
  automatic signup credits are disabled and example subscriptions have no
  default trial. `free` remains only the internal no-entitlement state.
- Review found and fixed a soft-404 gap. The explicit splat route now throws
  TanStack Router's native `notFound()`, so unpublished locale URLs and other
  unmatched paths produce HTTP 404; 404 responses also receive
  `X-Robots-Tag: noindex, nofollow`.
- Review removed two active-document drifts: the Email guide no longer exposes
  deleted OTP configuration, and the Backoffice guide no longer calls v0.11.0
  the current template version.
- No database schema, migration, downstream repository, production resource,
  secret, deployment, account feature, RBAC, tax, staging, control-plane, or
  CodeGraph scope was added.
- Static inspection found no active-runtime OTP/demo-component imports and no
  new cross-layer dependency. The CSV has 65 unique 17-field records, no empty
  risk values, no dangling TODO references, and no missing evidence paths.
- Test fixtures that mentioned the removed OTP fields were reserved for and
  updated during the later test-authoring phase. No test, build, type, lint,
  browser, or production command was run during implementation review.

The unresolved items are adoption decisions, not mother-template blockers:
each downstream still chooses its single charging model and provider IDs; the
operator still records the real Cloudflare plan, backup location, and rehearsal
date before production; HTML5.ai and AIAnswers remain untouched.

## Authored test coverage

After implementation review and owner continuation:

1. `scripts/check-module-feature-todo.mjs` validates the CSV schema, IDs,
   dependencies, risks, and evidence paths using only the standard library;
   `scripts/check-module-feature-todo.test.mjs` covers its parser and failures.
2. `apps/web/src/configs/publication-paths.test.ts` proves only English public
   pages and alternates are emitted, every private prefix shares the robots,
   no-index, sitemap/prerender rule, and unmatched routes use native 404 state.
3. Existing app-config, Web config, and server Auth suites now prove OTP is
   absent while the existing email/password registration checks remain.
4. Paid-default coverage proves signup grants and subscription trials stay off.
5. `scripts/check-deploy-entry-points.mjs --self-check` validates guarded
   production entry points, explicit preview configs, and the absence of a
   development deploy alias.

No snapshot-heavy UI suite, fixture framework, dependency, or test runner was
added. These checks are authored, wired into the existing gates, and passed in
the authorized PR verification recorded below.

Auth and deployment safety are mandatory trust paths. Deferring their tests
until after implementation review does not make them optional before delivery.

## Verification record

The owner explicitly authorized automated verification after fixing the GitHub
Actions billing issue. PR #115 passed the following gates on 2026-08-28:

- Quality/static: `pnpm docs:facts-check` (including the CSV checker),
  `pnpm check:boundaries`, `pnpm lint`, `pnpm fmt:check`, and
  `pnpm check-types`.
- Quality/test: `pnpm test:unit` and the full `pnpm test` release gate.
- Quality/build: `pnpm db:check`, `pnpm build`, `pnpm profiles:build`, and
  `pnpm perf:budget`.
- Mobile/check and the OSV dependency-vulnerability scan.

Focused local checks used while resolving CI findings also passed:

- `pnpm --filter web exec vitest run src/configs/publication-paths.test.ts src/configs/web-config.test.ts`
- `pnpm --filter web exec vitest run src/configs/publication-paths.test.ts`
- `pnpm --filter web build`
- `pnpm --filter web fmt:check`
- `pnpm check-types`
- `git diff --check`

No browser, production configuration, production deploy, D1, secret, or
downstream command was run.

## Red-line handoff

- Never push `main`; use a focused PR and preserve required merge ancestry.
- Never deploy from a dirty workspace or one that differs from `main`.
- Never run a production D1 migration, restore, secret mutation, or resource
  deletion without explicit authority.
- End each implementation milestone at an undeployed checkpoint. By explicit
  owner instruction for this change, use versioned Conventional Commits on the
  feature branch and never push `main`.
