# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EasyStarter is a modern full-stack TypeScript SaaS template built as a monorepo with three main applications:

- **Web App** (`apps/web`): React 19 + TanStack Start frontend
- **API Server** (`apps/server`): Hono + Cloudflare Workers backend
- **Mobile App** (`apps/native`): React Native + Expo

## Architecture

### Tech Stack

- **Frontend**: React 19, TanStack Start (Vite), TailwindCSS 4, shadcn/ui
- **Backend**: Hono, Cloudflare Workers, D1 (SQLite), Drizzle ORM
- **API**: oRPC for end-to-end type safety (Zod schemas)
- **Auth**: Better Auth — email/password, OAuth (GitHub, Google, Apple), and phone number / SMS OTP, with the Expo plugin for native
- **Payments**: Web via Stripe and Creem; native via RevenueCat — plus a built-in credits system
- **Email**: Resend with React Email templates
- **i18n**: use-intl, locales en/zh/jp
- **Mobile**: React Native with Expo (Expo Router)
- **Monorepo**: Turborepo + pnpm workspaces

### Key Patterns

**Type-Safe API Communication**: Uses oRPC for end-to-end type safety between client and server. API routes are defined in `apps/server/src/routers/` and consumed via the `@repo/api-client` package.

**Database**: Cloudflare D1 (SQLite) with Drizzle ORM. Schema files in `apps/server/src/db/schema/` (`auth.ts`, `credits.ts`, `payments.ts`). Migrations handled via `drizzle-kit`.

**Authentication Flow**: Better Auth handles sessions, with middleware in `apps/server/src/middlewares/auth.ts`. It supports email/password, OAuth (GitHub, Google, Apple), and phone number / SMS OTP. SMS providers live in `apps/server/src/sms/`, Apple Sign In config in `apps/server/src/lib/apple-auth.ts`. Native clients authenticate via the Better Auth Expo plugin. Web routes are protected using TanStack Router's authentication patterns.

**Payments & Credits**: Payment provider config is centralized in `@repo/app-config` (`payments/web.ts`, `payments/native.ts`, `payments/web-policy.ts`, `payments/shared.ts`). Web checkout supports Stripe and Creem; native uses RevenueCat. The credits system spans `@repo/app-config/credits.ts`, `@repo/shared/credits.ts`, server logic in `apps/server/src/credits/`, and oRPC routes in `apps/server/src/routers/`. Pricing tiers are defined in `packages/shared/src/pricing-config.ts`.

**Shared Packages**:

- `@repo/shared`: Cross-platform utilities and types (credits, pricing-config, format, date, phone, storage, etc.)
- `@repo/api-client`: Type-safe oRPC client
- `@repo/app-config`: App, payments, credits, and storage configuration shared across web/native/server
- `@repo/i18n`: Internationalization (en/zh/jp); supported locales defined in `packages/i18n/src/locales.ts`

## Development Commands

### Start Development

```bash
pnpm dev                 # Start all apps
pnpm dev:web            # Web app only (Vite, port 3000)
pnpm dev:server         # API server only (Wrangler, port 3001)
pnpm dev:native         # Mobile app only (Expo)
pnpm dev:web+server     # Web + server together
pnpm dev:native+server  # Native + server in parallel
pnpm dev:ios-device+server      # iOS device + server
pnpm dev:android-device+server  # Android device + server
```

### Database Operations

```bash
pnpm db:push            # Push schema changes to D1
pnpm db:generate        # Generate migration files
pnpm db:migrate         # Run migrations (production)
pnpm db:migrate:local   # Run migrations (local)
pnpm db:studio          # Open Drizzle Studio GUI
pnpm db:studio:local    # Open Drizzle Studio against local D1
```

### Build & Deploy

```bash
pnpm build              # Build all apps
pnpm deploy             # Deploy web + server
pnpm deploy:web         # Deploy web app only
pnpm deploy:server      # Deploy API server only
```

### Code Quality

```bash
pnpm lint               # oxlint across web, server, native
pnpm lint:fix           # oxlint with --fix
pnpm fmt                # oxfmt (write)
pnpm fmt:check          # oxfmt (check only)
pnpm check-types        # TypeScript type checking (turbo)
pnpm clean              # Clean node_modules and build artifacts
```

### Testing

`pnpm test` is the default template verification gate. Focused package tests
remain available when working on a narrow area:

```bash
pnpm test                         # Template and integration checks
pnpm -F @repo/shared test       # Shared utilities tests
pnpm -F @repo/app-config test   # Payments/credits config tests
```

Before modifying upstream core, read `GOVERNANCE.md` and
`docs/architecture-boundaries.md`. Product behavior belongs in a product
module, not in core infrastructure.

### Server Utilities

```bash
pnpm -F server email-preview    # Preview email templates (port 4000)
pnpm -F server compile          # Compile to standalone binary
```

## File Structure Patterns

### Web App Routes (`apps/web/src/routes/`)

- `__root.tsx`: Root layout with providers
- `$.tsx`: Catch-all (404) route
- `_public/`: Public routes — `(marketing)` landing and `(legal)` pages
- `_authed/`: Protected routes — `(dashboard)` requiring authentication
- `(auth)/auth/`: Authentication-related routes (sign in/up, callbacks)
- `billing/`: Checkout success/cancel and billing entry
- `docs/`: Documentation routes
- `api/`: Server route handlers (e.g. `search.ts`)
- File-based routing via TanStack Router

### API Server (`apps/server/src/`)

- `index.ts`: Main Hono app with middleware chain
- `routers/`: oRPC route definitions, split into `common/` (credits, payments, storage, users) and `web/` (web-specific credits, payments)
- `handlers/`: Request handlers (`rpc.ts`, `api.ts`, `storage.ts`, `native-verify-email-bridge.ts`)
- `db/schema/`: Drizzle schemas (`auth.ts`, `credits.ts`, `payments.ts`)
- `middlewares/`: `auth.ts`, `cors.ts`, `error.ts`, `i18n.ts`
- `lib/`: Utilities (`auth.ts`, `apple-auth.ts`, `phone-email.ts`, `password.ts`, `orpc.ts`, `context.ts`)
- `credits/`: Credit balance, grants, and order logic
- `payments/`: Payment provider integrations (Stripe, Creem, RevenueCat webhooks)
- `sms/`: SMS provider(s) for phone OTP
- `emails/`: React Email templates and senders
- `storage/`: R2/object storage helpers

### Native App (`apps/native/`)

- Expo Router file-based routing under `app/` (`(auth)`, `(tabs)`, `_layout.tsx`, `modal.tsx`)
- Shares auth, config, and i18n via workspace packages
- EAS build/submit/update scripts in `package.json` (`eas:build:*`, `eas:submit:*`, `eas:update:*`)

### Shared Components

- `apps/web/src/components/ui/`: shadcn/ui components
- `apps/web/src/components/layout/`: Layout components
- `packages/shared/src/`: Cross-platform utilities

## Configuration Files

### Environment Setup

Copy the `.example` files when setting up local env:

- `apps/web/.env.development.example` / `.env.production.example`: Web app config
- `apps/server/.dev.vars.example`: Server development variables (Wrangler)
- `apps/server/.env.production.example`: Server production secrets (`pnpm -F server secrets:bulk:production`)
- `apps/native/.env.development.local.example` / `.env.production.example`: Native config
- `apps/server/wrangler.jsonc` and `apps/web/wrangler.jsonc`: Cloudflare Workers config

### Key Config Files

- `turbo.json`: Turborepo task definitions
- `.oxfmtrc.json` (root) + per-app `.oxlintrc.json` (`apps/web`, `apps/server`, `apps/native`): formatting and lint rules
- `apps/server/drizzle.config.ts` (+ `drizzle.local.config.ts`): Database configuration
- `packages/shared/src/pricing-config.ts`: Pricing tiers
- `packages/app-config/src/`: Payments, credits, and storage configuration

## Development Workflow

1. **Database Changes**: Modify schema in `apps/server/src/db/schema/`, run `pnpm db:generate`, then `pnpm db:push`
2. **API Changes**: Add routes in `apps/server/src/routers/` (`common/` for shared, `web/` for web-only), types automatically sync to frontend
3. **UI Components**: Use existing shadcn/ui components or add new ones via the `easystarter-component` skill
4. **Authentication**: Routes are protected via TanStack Router's auth patterns
5. **Internationalization**: Add translations in `packages/i18n/src/messages/<surface>/<locale>.json` (surfaces: `common`, `web`, `server`, `native`); register new locales in `packages/i18n/src/locales.ts`

## Important Notes

- Uses oxfmt/oxlint for formatting and linting instead of ESLint/Prettier
- TailwindCSS 4 with CSS-first configuration
- React 19 with React Compiler enabled
- Both web and server deploy to Cloudflare Workers (edge runtime)
- Type safety enforced end-to-end via oRPC + Zod
- Mobile app shares business logic via workspace packages
- Local agent skills live in `.agents/skills` and `.codex/skills`; OpenSpec change proposals live in `openspec/`

## Figma MCP Integration Rules

These rules define how to translate Figma inputs into code for this project and must be followed for every Figma-driven change.

### Required flow (do not skip)

1. Run get_design_context first to fetch the structured representation for the exact node(s).
2. If the response is too large or truncated, run get_metadata to get the high‑level node map and then re‑fetch only the required node(s) with get_design_context.
3. Run get_screenshot for a visual reference of the node variant being implemented.
4. Only after you have both get_design_context and get_screenshot, download any assets needed and start implementation.
5. Translate the output (usually React + Tailwind) into this project's conventions, styles and framework. Reuse the project's color tokens, components, and typography wherever possible.
6. Validate against Figma for 1:1 look and behavior before marking complete.

### Implementation rules

- Treat the Figma MCP output (React + Tailwind) as a representation of design and behavior, not as final code style.
- Replace Tailwind utility classes with the project's preferred utilities/design‑system tokens when applicable.
- Reuse existing components (e.g., buttons, inputs, typography, icon wrappers) instead of duplicating functionality.
- Use the project's color system, typography scale, and spacing tokens consistently.
- Respect existing routing, state management, and data‑fetch patterns already adopted in the repo.
- Strive for 1:1 visual parity with the Figma design. When conflicts arise, prefer design‑system tokens and adjust spacing or sizes minimally to match visuals.
- Validate the final UI against the Figma screenshot for both look and behavior.

# MCP Servers

## Figma MCP server rules

- The Figma MCP server provides an assets endpoint which can serve image and SVG assets
- IMPORTANT: If the Figma MCP server returns a localhost source for an image or an SVG, use that image or SVG source directly
- IMPORTANT: DO NOT import/add new icon packages, all the assets should be in the Figma payload
- IMPORTANT: do NOT use or create placeholders if a localhost source is provided

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
