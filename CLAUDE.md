# EasyStarter context for Claude Code

`AGENTS.md` is the canonical engineering instruction source. Read it together
with `GOVERNANCE.md` and `docs/architecture-boundaries.md` before changing
upstream infrastructure.

## Current facts

- Core applications are `apps/web` (TanStack Start) and `apps/server`
  (Hono/oRPC on Cloudflare Workers).
- D1 business data is owned only by the API Worker. Web calls the API and never
  receives a D1 binding or writes SQL.
- `optional/mobile` is an opt-in Expo workspace with its own lockfile. Use
  `pnpm mobile:dev` or `pnpm mobile:check` only when the product adopts it.
- Root checks are `pnpm fmt:check`, `pnpm lint`, `pnpm check-types`,
  `pnpm test`, and `pnpm build`.

New product behavior belongs in server and web product modules. Do not add it
to auth, payments, credits, Jobs, storage, migrations, shared packages, or CI
without a reusable upstream reason and a focused PR.
