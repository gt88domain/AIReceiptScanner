## Project Overview

TanStack Template is a TypeScript monorepo built with Turborepo and pnpm workspaces.

- `apps/web`: React 19 + TanStack Start web app, Vite dev server on port 3000.
- `apps/server`: Hono + Cloudflare Workers API server, Wrangler dev server on port 3001.
- `apps/native`: Expo + React Native app using Expo Router.
- `packages/api-client`: shared type-safe API client.
- `packages/app-config`: shared app, payments, credits, and storage configuration.
- `packages/i18n`: shared messages and i18n helpers.
- `packages/shared`: shared utilities and types.

TanStack Start routes live in `apps/web/src/routes`. Server code lives in
`apps/server/src`, with database schemas in `apps/server/src/db/schema` and
oRPC routers in `apps/server/src/routers`.

## Core Commands

- `pnpm install`: install workspace dependencies.
- `pnpm dev`: run all apps through Turbo.
- `pnpm dev:web`: run the web app.
- `pnpm dev:server`: run the API server.
- `pnpm dev:native`: run Expo.
- `pnpm dev:web+server`: run web and server together.
- `pnpm build`: build all packages/apps that define `build`.
- `pnpm check-types`: run Turbo type checks for workspaces that define `check-types`.
- `pnpm lint` / `pnpm lint:fix`: run or fix OXC lint checks for web, server, and native.
- `pnpm fmt` / `pnpm fmt:check`: run or check OXC formatting for web, server, and native.

Database and deployment commands:

- `pnpm db:generate`: generate Drizzle migrations.
- `pnpm db:push`: push schema changes.
- `pnpm db:migrate`: run configured migrations.
- `pnpm db:migrate:local`: run local D1 migrations.
- `pnpm db:studio` / `pnpm db:studio:local`: open Drizzle Studio.
- `pnpm deploy`: deploy server and web.
- `pnpm deploy:server` / `pnpm deploy:web`: deploy one side.

There is no root `test` script. Some packages define local Vitest scripts, such
as `pnpm -F @repo/shared test` and `pnpm -F @repo/app-config test`.

## TypeScript Verification

This is a TypeScript project. After small code edits, type checking is not
required unless a problem appears. After large changes, run `pnpm check-types`
and keep fixing issues until type checking passes completely.

Do not run type checks for documentation-only edits.

## Coding Guidelines

Prioritize sound, maintainable solutions over tiny diffs. Keep changes scoped to
the request, but do not preserve awkward structure, duplication, or poor
boundaries just to touch fewer lines.

Do not keep adding logic to the same file indefinitely. When a file exceeds 500
lines, extract cohesive code into appropriate modules. Before writing public
functions or reusable/common logic, search the repository for existing reusable
functions, utilities, and patterns. If existing code can be reused, use it; if
the logic should become shared, extract it into an appropriate shared file.

Do not over-abstract:

- Do not create interfaces, protocols, builders, or public helper files for a
  single implementation or one-time operation.
- Keep implementation details private when only one module needs them.
- Prefer simple constructors, object literals, functions, callbacks, and
  composable rules over heavyweight configuration objects or fixed boolean
  toggles.

Do not over-defend:

- Add validation and type guards at true system boundaries that accept external
  or untrusted input.
- Avoid defensive checks, defensive copies, or impossible-case handling inside
  trusted internal code unless the surrounding code already does so for a clear
  reason.

Use modern, idiomatic TypeScript and React. Prefer `import type` / `export type`
for type-only imports and exports. Use structured APIs and parsers instead of
ad hoc string manipulation when practical.

## Existing Project Patterns

- Formatting and linting use OXC (`oxlint` and `oxfmt`), not Prettier.
- The web app uses TanStack Start file-based routing under `apps/web/src/routes`.
- Shared UI components live in `apps/web/src/components/ui`; prefer existing
  components before adding new ones.
- Server API routes are built with Hono and oRPC under `apps/server/src`.
- New product-domain server code belongs in `apps/server/src/modules/<domain>`.
  `routers/` mounts public routers and `lib/` contains shared technical
  infrastructure; neither is a home for product business logic. Follow
  `apps/server/src/modules/README.md` for layer and import-direction rules.
- New product-domain web code belongs in `apps/web/src/modules/<domain>`.
  Keep TanStack route files thin and do not add new domains to the legacy
  `apps/web/src/custom` directory.
- Gate product features through `context.capabilities.can(user, capability)`;
  do not compare plan names in application code. Define the minimum tier in
  `packages/app-config/src/app-config.ts`.
- Put retryable background work in `apps/server/src/modules/jobs`. Job handlers
  must be idempotent because queue delivery is at least once. Use Cloudflare
  Workflows directly for long-lived, multi-step, or human-approval work.
- Persist an asset record for each product file and enforce its visibility via
  `apps/server/src/modules/assets`; do not expose a raw storage key as a public
  authorization decision.
- Database schema changes belong in `apps/server/src/db/schema` and use
  Drizzle migrations. Keep structural migrations, data migrations, seeds,
  backfills, and repairs separate as defined in `apps/server/src/db/README.md`.
- Cross-platform code should live in workspace packages only when both web and
  native or server genuinely need it.
- i18n messages live under `packages/i18n/src/messages`; implementation notes
  are in `docs/i18n-implementation.md`.

## Migration Playbook

For any migration from an existing app, site, database, or provider, follow the
documents in `docs/migration/` in this exact order:

1. `00-audit.md`
2. `01-data-owner.md`
3. `02-domain-model.md`
4. `03-schema-plan.md`
5. `04-security-check.md`
6. `05-cutover.md`

The required engineering sequence is **Audit → Architecture → Schema →
Migration → Feature**. Do not copy old code, repair pages, or add features
until the audit, data-owner decision, domain model, schema plan, and security
check for the migration slice exist and are reviewable. Treat legacy code as
evidence, not the target architecture.

Structural migrations, data migrations, seeds, backfills, and repairs remain
separate as defined in `apps/server/src/db/README.md`. Each migration slice must
have a named owner, source-of-truth decision, validation method, and rollback or
forward-fix plan before cutover.

## Testing Guidelines

The template's core trust and money paths are mandatory test coverage. Keep
focused automated checks for authentication, administrator authorization,
billing and entitlement resolution, verified webhook idempotency, credits,
and migration application. When changing one of those paths, add or update the
smallest focused test that proves the behavior. `pnpm test` is the default
template gate; it runs both `pnpm test:template` and `pnpm test:integration`
before review or release.

UI behavior and marketing pages are optional: add tests when their interaction
or regression risk justifies the maintenance cost. Use `*.test.ts(x)` or
`*.spec.ts(x)` and keep tests focused on meaningful behavior, edge cases, and
error conditions. If a package needs a new test runner script, document it in
that package's `package.json`.

## Git And Changes

The worktree may already contain user changes. Never revert or overwrite changes
you did not make unless the user explicitly asks. Ignore unrelated dirty files.
When your own changes make imports, variables, or functions unused, remove only
that newly orphaned code.

Commit messages should follow Conventional Commits. Use `pnpm commit` when the
user asks to create a commit.

## Demo Page Deployment

For a completed change that affects a user-facing page or visual web UI:

1. Run focused page verification appropriate to the change.
2. Create a Git checkpoint commit and push the current branch to `origin`.
3. Run `pnpm deploy:web` to update the production web domain configured for the project.
4. Verify the affected production URL and report the commit and URL.

Do not run page verification or deploy for non-page changes (for example,
server-only code, refactors, configuration, documentation, or tests) unless the
user explicitly requests it.

## Configuration And Secrets

Use env examples such as `apps/web/.env.development.example` and
`apps/web/.env.production.example` when setting up local env files. Server
runtime configuration is in `apps/server/wrangler.jsonc`. Do not commit real
secrets.

## Authorization And Billing Boundaries

Keep administrator access, authenticated-user access, and paid entitlement as
separate concepts.

- Administrators are determined only by a production-only `ADMIN_EMAILS` secret
  allowlist. Normalize email addresses before comparison and perform the check
  on the server for every administrative procedure.
- A logged-in user is ordinary unless their session email is in that allowlist.
  Do not add `user.role`, `user_roles`, role management, or a database-backed
  admin grant without an explicit product decision.
- Free versus paid is an entitlement, not a role. Resolve it only from verified
  payment-provider webhook records such as successful purchases and active
  subscriptions.
- Frontend plan badges and hidden navigation are presentation only. They must
  never grant paid features or administrative access.
- Administrative user and billing data must be exposed only by server-side
  admin procedures. A `protectedProcedure` alone is not an admin check.
- Do not let a payment event grant administrator access, and do not let an
  administrator flag synthesize a paid entitlement.
- Use `requireUser`, `requireAdmin`, `requireCapability`, and
  `requireEntitlement` from `apps/server/src/auth/guards` for new server
  authorization checks. Do not create project-specific session/header guards
  or database-backed roles without an explicit product decision.
- Authorization or webhook changes require focused tests for ordinary-user
  denial, admin allowlist access, paid-user non-admin denial, and webhook
  idempotency.

## Production Deployment Guard

`pnpm -F server deploy` runs the production safety preflight first. Before a
production deploy, create `apps/server/.production-safety.env` from its example
and set the exact Worker, D1, R2, and public URL identities that deployment may
target. The guard also validates the configured production secrets and live
payment-provider mode from `apps/server/.env.production`.

## Skills

Local skills live in `.agents/skills` and `.codex/skills`. If the user names a
skill, or the task clearly matches a skill's description, read that skill's
`SKILL.md` and follow it for the turn. Do not carry skill instructions across
turns unless the user mentions the skill again.

Use only the minimal set of skills that fits the task. If a skill cannot be
applied cleanly because files or instructions are missing, state the issue
briefly and continue with the best fallback.

## Figma MCP Rules

For Figma-driven work:

1. Fetch structured design context for the exact node before implementation.
2. If the response is too large, fetch metadata first and then re-fetch only the
   required node.
3. Fetch a screenshot for visual reference before coding.
4. Use provided localhost asset URLs directly when the Figma MCP returns them.
5. Do not import new icon packages for Figma assets.
6. Translate generated React/Tailwind into this project's conventions and
   existing components.
7. Validate the final UI against the Figma screenshot before marking the work
   complete.
