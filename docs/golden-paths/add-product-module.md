# Add a product module

Create `apps/server/src/modules/<domain>` with schema, repository, service,
policy, and router layers. Add matching UI under `apps/web/src/modules/<domain>`;
routes remain thin API clients. Do not import Better Auth, D1 bindings, or
provider SDKs from the product module. Run `pnpm check:boundaries`, focused
tests, and `pnpm test` before the PR.

Good: a catalog service calls standard guards and its repository. Forbidden: a
web component imports Drizzle or a product module checks a plan name directly.
