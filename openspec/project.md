# Project context

EasyStarter is a governed TypeScript SaaS template. Its default applications
are `apps/web` (React, TanStack Start, Vite, Tailwind) and `apps/server`
(Hono, oRPC, Cloudflare Workers). D1 is the API Worker's business-data owner;
Drizzle schema and migrations live under `apps/server/src/db`.

`optional/mobile` is an opt-in Expo workspace, not a default dependency of a
Web-only product. It has separate `pnpm mobile:*` commands and its own lockfile.

The package manager is pnpm 11.13.1 and the default branch is `main`. Root
verification is `pnpm fmt:check`, `pnpm lint`, `pnpm check-types`, `pnpm test`,
and `pnpm build`.

Read `AGENTS.md`, `GOVERNANCE.md`, and
`docs/architecture-boundaries.md` for the current engineering rules. Preserve
the API Worker data boundary, immutable migration history, production-safety
preflight, standard authorization guards, and source-controlled capability
configuration. Do not add multi-tenancy, product-specific roles, dynamic
plugins, or a database-provider abstraction without an approved product need.
