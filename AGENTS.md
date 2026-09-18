# EasyStarter agent instructions

EasyStarter is a governed TypeScript template used to ship multiple paid products.
Optimize for repeatable solo-maintainer delivery: reuse the platform, keep
product changes outside core, and write the minimum code that proves the need.

## Start here

Before editing, classify the request:

- Product/site behavior: define the paid offer and delivery path, then work in
  `apps/*/src/modules/<domain>`, product config, content, or theme; read this
  file and the closest module README.
- Reusable template/platform: before changing auth, payments, credits, Jobs,
  storage, DB lifecycle, packages, or CI, read
  `docs/architecture-boundaries.md` and the latest relevant dated audit.
  Audits are historical evidence; verify current facts in executable
  configuration.
- Existing-app/provider migration: create `docs/migration/00-audit.md` through
  `05-cutover.md` in their documented order before feature code.
- Production operation: read the relevant runbook and require explicit user
  authorization for migrations, secrets, Cloudflare resources, and deploys.

Use [the repository map](docs/repo-map.md) for change navigation and
[the architecture map](docs/architecture-map.md) for topology and critical
flows. [`GOVERNANCE.md`](GOVERNANCE.md) is a non-normative pointer to operating
references; this file remains the sole normative instruction source.
`template-kit/repository-facts.json` is the only machine-readable source for
repository facts and enforced import boundaries; do not create a second
hard-coded rule set or generated repo map.

## Working style

- Ask whether the feature is needed, then prefer the standard library, a native
  platform feature, or an installed dependency before writing new code.
- Search with `rg` / `rg --files` before adding a public helper, dependency, or
  parallel implementation.
- Prefer deletion, direct functions, object literals, and existing extension
  points. Do not add a framework, registry, service locator, event bus, or
  provider abstraction for one implementation.
- Validate untrusted input and protect data, money, authorization,
  accessibility, and external effects. Do not add defensive ceremony inside
  trusted code for impossible states.
- Mark an intentional shortcut with `ponytail:` and name both its ceiling and
  upgrade path.
- Preserve unrelated user changes. Remove only code made unused by this task.
- Leave each milestone uncommitted and undeployed for user review unless the
  user explicitly asks for a commit, push, migration, or deployment.

## Repository map

- `apps/web`: React 19 + TanStack Start. Routes are under `src/routes`.
- `apps/server`: Hono + oRPC API Worker. It is the sole business-data owner.
- `optional/mobile`: opt-in Expo app with its own workspace install.
- `packages/api-client`: shared typed oRPC client.
- `packages/app-config`: product configuration and protected composition rules.
- `packages/i18n`: shared locale contracts and messages.
- `packages/shared`: platform-neutral utilities and types.
- `template-kit`: profiles, adoption manifests, repository facts, and checks.

New product settings belong in the explicitly product-owned files under
`packages/app-config`, especially `product-config.ts`. Resolver types,
dependency rules, and provider-independent composition remain platform code.

## Code placement and dependency direction

- Server product code belongs in `apps/server/src/modules/<domain>`.
  `routers/` mounts public routers; `lib/` is shared technical infrastructure.
- Web product code belongs in `apps/web/src/modules/<domain>`. Keep route files
  thin and do not add new domains to legacy `apps/web/src/custom`.
- A server module normally flows `router -> service -> repository -> db`, but
  small modules should omit unused layers.
- Shared workspace code is justified only when at least two runtimes genuinely
  need it. Core packages never import product or optional-mobile code.
- Add public product routers through `apps/server/src/modules/index.ts`.
- Do not edit generated route trees manually.

Plan `pnpm check:boundaries` after changing an ownership or import boundary;
run it only when the user requests verification.

## Runtime boundaries

- Browser, Web Worker, and mobile clients access business data through the API
  Worker. The Web Worker may use `API_SERVICE`; it must not receive D1 or write
  business SQL.
- oRPC owns bounded request/response work. Use persisted Jobs + Queues for
  retryable work, Workflows for long-lived/sleeping/approval flows, and a
  dedicated Durable Object design for coordinated WebSockets.
- Queue delivery is at least once. Job handlers and their external effects must
  be idempotent.
- Product files require an asset record and Asset Service authorization. Never
  expose a raw storage key as the authorization decision.
- Feature availability comes from the source-controlled composition in
  `packages/app-config`; do not add a second flag system or compare plan names
  in application code.

See `docs/orpc-worker-boundaries.md`, `docs/async-reliability.md`, and
`docs/rate-limiting.md` before changing those respective boundaries.

## Authorization and money

Authentication, administrator access, capability access, and paid entitlement
are separate decisions:

- Use `requireUser`, `requireAdmin`, `requireCapability`, and
  `requireEntitlement` from `apps/server/src/auth/guards`.
- Admin is a normalized-email match against the production-only `ADMIN_EMAILS`
  secret. Do not add roles or database-backed admin grants without an explicit
  product decision.
- Paid entitlement comes only from verified provider webhook records. UI
  badges, hidden navigation, redirects, and admin status do not grant it.
- Only `apps/server/src/auth/adapter.ts` may expose auth-provider operations.
  Product modules consume `Context.session` and standard guards.
- A `protectedProcedure` is not an administrator check.
- Webhook handlers and credit effects must preserve idempotency and recovery.

Changes to auth, admin, billing, entitlements, credits, or webhooks require the
smallest focused tests proving denial and allow paths, plus webhook or ledger
idempotency where applicable. Add those tests in the final test phase after the
implementation has passed its core-goal review.

## Database and migrations

- Drizzle schema and structural migrations live in `apps/server/src/db`.
- Structural migrations, data migrations, seeds, backfills, and repairs are
  separate lifecycles; follow `apps/server/src/db/README.md`.
- Applied migrations are immutable. Recover with a forward fix, compatible
  traffic rollback, or approved repair—never by deleting migration history.
- For an existing-app/provider migration, follow this exact sequence:
  Audit → data owner → domain model → schema plan → security check → cutover.
  Legacy code is evidence, not the target architecture.
- Every migration slice needs an owner, source of truth, validation method, and
  rollback or forward-fix plan before cutover.

## Implementation, test planning, and verification

For every non-trivial implementation, keep one change-local plan document.
Prefer the task's existing spec or plan; otherwise create
`docs/plans/<task-slug>.md`. The plan must record:

- the core goal and observable acceptance criteria;
- implementation phases and the files or boundaries each phase owns;
- a deferred test plan covering behaviors, edge cases, trust boundaries,
  expected test files, and recommended commands; and
- explicit statuses for implementation review, test authoring, and test
  execution so planned coverage is not mistaken for completed coverage.

Use this order unless the user explicitly requests TDD or another sequence:

1. Record the test plan, but do not write tests yet.
2. Implement the complete requirement.
3. Review the implementation against the core goal, acceptance criteria,
   architecture boundaries, and the actual diff. Fix implementation problems
   before encoding the behavior in tests.
4. After the core-goal review passes, add all planned automated tests together
   as the final implementation phase. Keep them focused on behavior rather than
   implementation details.
5. Do not run tests, builds, type checks, browser verification, or other
   verification commands unless the user explicitly asks for automated
   verification. Report the recommended commands and clearly mark them as not
   run.

Trivial one-line and documentation-only changes do not need a task plan or new
tests. Mandatory trust and money coverage still applies, but test authoring is
deferred until after implementation review like all other tests.

Recommended verification when requested:

- Guidance or repository facts: `pnpm docs:facts-check`.
- Small implementation: the focused test or self-check that would catch it.
- Ownership/config boundary: `pnpm docs:facts-check` and
  `pnpm check:boundaries`.
- Auth, money, webhook, or migration: focused trust-path tests, then
  `pnpm test`.
- Large cross-workspace change: `pnpm check-types`, `pnpm test`, and
  `pnpm build`.
- Visual page: focused local page verification; production verification only
  after an explicitly requested deploy.

Formatting and linting use OXC (`pnpm fmt`, `pnpm fmt:check`, `pnpm lint`), not
Prettier. `pnpm test` is the default release/review gate, not an automatic
per-task action.

Common commands:

- `pnpm dev:web+server`, `pnpm dev:web`, `pnpm dev:server`
- `pnpm mobile:dev`, `pnpm mobile:check`
- `pnpm db:generate`, `pnpm db:migrate:local`, `pnpm db:check`
- `pnpm profiles:check`, `pnpm profiles:build`
- `pnpm verify:production-config`

## Git and production safety

- Never push directly to `main`; use a PR.
- Upstream-adoption PRs, tag merges, and `source.json` changes require a merge
  commit. Do not squash, rebase, or auto-merge them because ancestry is part of
  the manifest contract.
- Use Conventional Commits and `pnpm commit` only when asked to commit.
- Do not run a production D1 migration, change secrets, delete a worktree or
  branch, or deploy without explicit authorization.
- Production deploys must start from a clean workspace matching `main` and pass
  `pnpm verify:production-config` using
  `apps/server/.production-safety.env`.
- Daily production preflight verifies required secret names on the live Worker
  with `wrangler secret list`; it does not require local plaintext secrets.
  `apps/server/.env.production` is used only for first setup or rotation through
  `pnpm --filter server secrets:push:production`.
- Release Please owns its release PR and three accounting files; do not merge
  or edit that PR manually.

## Task-specific guidance

- Active repository skills live in `.agents/skills`. If a task names or clearly
  matches one, read its `SKILL.md` and use only the minimal applicable set for
  that turn. Dormant reference skills live in `.agents/skills-archive`; they
  are historical inputs, not active instructions, and must be restored in a
  focused change before use.
- For Figma work, fetch exact-node design context and a screenshot before
  coding; reuse returned assets, avoid new icon packages, translate output into
  project conventions, and validate the result against the screenshot.
