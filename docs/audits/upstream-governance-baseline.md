# Upstream governance baseline audit

Date: 2026-08-02
Audited commit: `c0d5a6757a812f84206a8431ab6141533f4679ca` (`main`)

This is a repository-truth audit for the governed-upstream work. Executable
configuration and source code take precedence over prose. It deliberately does
not change runtime behavior.

## Verified repository state

| Area | Verified state |
| --- | --- |
| Package manager | pnpm `11.13.1`, pinned by root `packageManager` |
| Workspaces | `apps/*` and `packages/*`; native is currently a first-class workspace at `apps/native` |
| Default applications | Web Worker (`apps/web`) and API Worker (`apps/server`), but root Turbo commands also include native |
| Web | React 19, TanStack Start, Vite, Tailwind |
| API | Hono plus oRPC on Cloudflare Workers |
| Business-data owner | D1 via the API Worker only; the Web Worker has an API service binding and no D1 binding |
| Data lifecycle | Drizzle schema and immutable structural migrations are under `apps/server/src/db`; data migrations, seeds, backfills, and repairs have separate directories |
| Storage | R2 provider plus an asset metadata/authorization module |
| Auth | Better Auth is behind `apps/server/src/auth/adapter.ts`; standard server guards exist |
| Async work | Queue-backed jobs have durable records, an outbox, retry, idempotency keys, lease handling, and DLQ persistence |
| Money | Payment webhooks/outbox and a credits ledger are present; product configuration controls enabled modules |

The Worker configuration intentionally contains deployment placeholders. The
server deployment path runs a production safety preflight that rejects those
placeholders and validates the configured D1, R2, Queue, URLs, secrets, and
enabled payment-provider mode. The Web deployment calls the server preflight,
but the existing security audit correctly identifies that its identity is not
yet checked with the same depth as the server identity.

## Verified commands and CI

The root has `pnpm test`; it runs `test:template` and `test:integration`.
Other verified root commands include `lint`, `fmt:check`, `check-types`,
`build`, `db:check`, `db:migrate:local`, `deploy`, and `module:check`.

The current `Quality` workflow has one required-looking job named `verify`.
It checks out the repository, installs pnpm 11.13.1, uses frozen-lockfile
installation, and runs lint, format, types, native doctor, unit/template and
integration tests, Drizzle validation, and build. The separate `Dependency
vulnerability scan` workflow provides job `osv` on pull requests and a weekly
schedule. Neither workflow deploys infrastructure.

At audit time, the two open improvement PRs both had successful checks:

- PR #8, mobile isolation: `verify`, `osv`, and path-filtered `Mobile / check`.
- PR #9, template governance: `verify` and `osv`.

## Existing safeguards to preserve

- ADR 0002 keeps D1 ownership in the API Worker; ADR 0003 separates Queues
  from Workflows; ADR 0004 fixes Hono/oRPC at the API boundary.
- `apps/server/src/modules/README.md` already defines server domain placement
  and `router -> service -> repository -> db` direction.
- The production safety preflight blocks placeholder deployment configuration
  and validates module-dependent secrets.
- The feature contract is source controlled in `packages/app-config`; it is
  not a remote flag system and must remain the single capability source.
- Auth guards separate an authenticated user, an administrator, an entitlement,
  and a capability. Asset authorization, credits, audit logging, payment
  idempotency, Jobs/DLQ, and migration lifecycle rules already have focused
  implementation or tests.

## Documentation drift

These statements conflict with executable configuration and must be corrected
in the documentation-truth phase:

1. `README.md` says “zero configuration required.” Production adoption instead
   requires buyer-owned Worker, D1, R2, Queue, domain, and secret values.
2. `AGENTS.md` and `CLAUDE.md` say that there is no root `test` script, while
   root `package.json` defines `pnpm test`.
3. `AGENTS.md` documents a root `db:push` command, but root `package.json`
   does not define one.
4. Main still describes and executes `apps/native` as a normal workspace.
   It must not claim optional mobile until PR #8 (or an equivalent reviewed
   change) is merged.
5. The existing documentation uses both template-era and product-specific
   material. Product migration plans are useful evidence but are not upstream
   governance contracts.

## Missing governance mechanisms

- No accepted canonical governance manifest defines core, optional module,
  extension, generated, and product-extension paths in one place.
- No repository-facts checker protects AI guidance and documentation against
  machine-verifiable drift.
- No downstream source lock, Modification Manifest schema, PR-diff checker, or
  temporary-workaround expiry check exists.
- No compatibility policy, changelog, upgrade guide, stable tag process, or
  release automation exists yet.
- CI has useful broad verification, but its one `verify` job is not split into
  stable governance/architecture/facts/trust-path gates. It has no concurrency
  cancellation.
- Current architecture enforcement is mostly conventions and code review. A
  proposed narrow import check in PR #9 is useful as an interim guard, but does
  not prove all requested dependency directions.
- No documented static extension contract or Golden Paths exist. The existing
  job registry and provider adapters are real extension examples; a generic
  module registry is not justified until a repeated downstream core-change need
  is demonstrated.

## Scope decisions

Adopt the proposal's governance, downstream-control, facts, compatibility, and
release ideas in phases. Do not adopt its potential abstractions blindly:

- Do not introduce a dynamic plugin system, database-provider abstraction,
  service locator, event bus, dynamic migration loading, or product behavior in
  upstream core.
- Do not add a generic typed module descriptor in the first governance PR.
  First document the existing static job/provider extension points and use a
  descriptor only when it removes demonstrated duplicated registration.
- Do not add `dependency-cruiser` merely for policy coverage. Start with small
  deterministic checks generated from the canonical manifest; revisit a graph
  tool only if aliases make those checks unreliable.
- Do not configure GitHub branch protection automatically. Document solo-safe
  manual settings and apply them only with explicit repository-settings
  authority.
- Do not make a production deployment, mutate Cloudflare resources, or create
  secrets as part of governance work.

## Phased PR plan

1. **Phase 0 — this PR:** publish this audit only. Merge it before subsequent
   governance work, so the roadmap starts from verified main-branch facts.
2. **Phase 1 — documentation truth:** add `GOVERNANCE.md`, contribution and
   security policy, PR/issue templates, repository-facts source/checker, and
   correct the listed drift. Reconcile the earlier governance draft (PR #9)
   with these facts instead of maintaining duplicate policy documents.
3. **Phase 2 — machine boundaries:** introduce a single governance manifest and
   schema, derive a pragmatic architecture checker from it, add fixtures, and
   split CI into stable named gates without duplicate OSV scanning.
4. **Phase 3 — managed downstream control:** add source-lock and Modification
   Manifest schemas/templates, PR-diff and audit modes, a sync-PR template,
   and managed-versus-unmanaged adoption documentation.
5. **Phase 4 — extension and Golden Paths:** document existing adapters and
   Jobs as static extension points, add Golden Paths, and introduce a minimal
   descriptor only for an observed repeated modification.
6. **Phase 5 — compatibility and releases:** add SemVer/deprecation policy,
   changelog, upgrade guide, release PR automation, and stable tags. Downstream
   sync then targets released tags, not arbitrary `main` commits.
7. **Phase 6 — mobile:** merge/review the independently green mobile-isolation
   PR first, then document the exact achieved model. Until then main is not
   optional-mobile. Validate the resulting model as dependency-optional only
   if a core install does not resolve Expo dependencies.
8. **Phase 7 — pilot:** use a new, low-risk downstream (AIBranding is the
   proposed candidate), preserve ancestry from a stable tag, and record the
   source lock and any justified modifications before calling the system done.

## Items intentionally not changed in this audit

- Runtime architecture, schema, migrations, D1/R2/Queue resources, secrets,
  Worker domains, and production deployment behavior.
- Existing accepted ADR history, mobile source code, or open PR branches.
- Product-specific code, data, branding, roles, multi-tenancy, or provider
  choices.
