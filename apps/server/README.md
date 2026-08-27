# Server Worker

Hono + oRPC API running on Cloudflare Workers, with D1 persistence and optional
R2, Queue, email, and payment capabilities.

## Local development

From the repository root:

```bash
cp apps/server/.dev.vars.example apps/server/.dev.vars
pnpm db:migrate
pnpm dev:server
```

Wrangler serves the API on `http://localhost:3001`. The root `pnpm dev` command
starts the web and server workspaces together.

## Runtime map

- `src/index.ts` exports the Worker entry point.
- `src/app/create-app.ts` composes the Hono application and HTTP surfaces.
- `src/worker/create-worker-handlers.ts` owns Queue and scheduled handlers.
- `src/routers/runtime-router.ts` exposes only enabled oRPC namespaces.
- `src/auth/adapter.ts` is the only authentication-provider adapter available
  to product modules.
- `src/modules/<domain>/` owns product business logic.
- `src/db/schema/` and `src/db/migrations/` own D1 structure and history.

For change routing and critical flows, use
[`../../docs/repo-map.md`](../../docs/repo-map.md) and
[`../../docs/architecture-map.md`](../../docs/architecture-map.md).

## Ownership rules

- Keep public routers thin; put product logic in `src/modules/<domain>/`.
- Use `requireUser`, `requireAdmin`, `requireCapability`, and
  `requireEntitlement` from `src/auth/guards`.
- Use Jobs/Queues for short retryable work and Cloudflare Workflows for
  long-lived, multi-step, or human-approval work.
- Persist product-file ownership and visibility through `src/modules/assets`;
  a raw storage key is not an authorization decision.
- Follow `src/db/README.md` before changing schemas or data. Structural
  migrations, data migrations, seeds, backfills, and repairs are separate.

## Common commands

| Command                                     | Purpose                               |
| ------------------------------------------- | ------------------------------------- |
| `pnpm --filter server dev`                  | Start Wrangler on port 3001           |
| `pnpm --filter server check-types`          | Type-check the Server workspace       |
| `pnpm --filter server db:generate`          | Generate a structural migration       |
| `pnpm --filter server db:check`             | Validate Drizzle migration metadata   |
| `pnpm --filter server db:migrate:local`     | Apply migrations to local D1          |
| `pnpm --filter server db:studio:local`      | Open Drizzle Studio for local D1      |
| `pnpm --filter server email-preview`        | Preview React Email templates         |
| `pnpm --filter server preflight:production` | Validate the production target        |
| `pnpm --filter server deploy`               | Preflight, then deploy the API Worker |

Do not invoke raw `wrangler deploy`; it bypasses the fail-closed preflight.
Use `deploy:preview` only for the checked-in preview configuration.

## Production configuration

Production setup is fail-closed. Follow
[`../../docs/production-configuration.md`](../../docs/production-configuration.md)
instead of deploying once to discover resource names.

Daily deploys use `.production-safety.env` as the target fuse and verify the
required secret names on the live Worker; they do not need local plaintext
secrets. Create `.env.production` only on the machine used for first setup or
secret rotation, then run `pnpm --filter server secrets:push:production`.

Public URLs, OAuth client IDs, and Cloudflare resource bindings remain in
`wrangler.jsonc`. Never commit `.production-safety.env` or `.env.production`.

## Related documentation

- [`src/modules/README.md`](src/modules/README.md) — domain-module boundaries
- [`src/auth/README.md`](src/auth/README.md) — authentication boundary
- [`src/db/README.md`](src/db/README.md) — database operation lifecycles
- [`src/modules/jobs/README.md`](src/modules/jobs/README.md) — retryable jobs
- [`src/modules/assets/README.md`](src/modules/assets/README.md) — asset authorization
