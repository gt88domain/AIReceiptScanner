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
- Database schema changes belong in `apps/server/src/db/schema` and use
  Drizzle migrations.
- Cross-platform code should live in workspace packages only when both web and
  native or server genuinely need it.
- i18n messages live under `packages/i18n/src/messages`; implementation notes
  are in `docs/i18n-implementation.md`.

## Testing Guidelines

Do not add tests unless the user explicitly asks for them. If tests are added,
use `*.test.ts(x)` or `*.spec.ts(x)` and keep them focused on meaningful
behavior, edge cases, and error conditions. If a package needs a new test
runner script, document it in that package's `package.json`.

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
- Authorization or webhook changes require focused tests for ordinary-user
  denial, admin allowlist access, paid-user non-admin denial, and webhook
  idempotency.

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
