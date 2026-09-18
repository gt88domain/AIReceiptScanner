# Security configuration audit

> Historical audit from 2026-08-01. Its gaps were implementation inputs, not
> current operating instructions. Use
> [`production-configuration.md`](./production-configuration.md) and the current
> preflight source for production setup.

Date: 2026-08-01
Scope: reusable EasyStarter deployment configuration only. No product code, data, providers, or schema changes are included.

## 1. Current configuration flow

`pnpm deploy:server` runs `apps/server`'s `preflight:production` before `wrangler deploy`. The preflight reads the Server Worker `wrangler.jsonc`, `.env.production`, and `.production-safety.env`; it verifies the expected Server Worker, D1, R2, Queue, DLQ, public URLs, admin allowlist, Better Auth secret, and enabled payment-provider secrets.

The Web Worker runs `wrangler deploy` directly. It has a service binding to the API Worker, but no equivalent preflight and no check that its public URLs, Worker name, route, or service binding agree with the API Worker configuration.

CI runs the Server preflight self-check through the template tests. It does not run a full production-configuration verification because real production environment files are intentionally absent from the repository.

## 2. Production risks

- Server URL validation accepts HTTPS `example.com` domains and other inherited placeholder values.
- The D1 UUID check accepts the all-zero placeholder ID; R2, queue, DLQ, and Worker names only need to be non-empty.
- A Web deployment can be pointed at a different API Worker or public domain without the Server preflight noticing.
- The Job DLQ name is hard-coded in the Worker entry point, making queue naming less portable than the binding configuration suggests.
- Email sender configuration, OAuth client identifiers, and production price identifiers are not validated when their features are enabled.
- The current Web deploy command can publish the checked-in Worker configuration without a fail-closed confirmation file.

## 3. Demo/template leftovers

- `apps/web/wrangler.jsonc` currently contains a concrete demo Worker name, route, API service binding, and demo public URLs.
- Web and Server production example files include inherited demo URLs or leave values that should be explicit placeholders.
- Server `wrangler.jsonc` intentionally contains template values such as `your-worker-name`, `your-domain.example`, the all-zero D1 ID, and `tanstack-template-*` queues. These are useful examples but must be rejected at deployment time.
- Other demo strings in marketing, native, and product configuration are outside this infrastructure PR; they need a separate examples/branding decision rather than being silently repurposed as deployment identities.

## 4. Missing validation

- Reject placeholder domains, HTTP URLs, localhost, placeholder Worker/resource names, and the all-zero D1 ID in production.
- Validate Web Worker identity, custom route, public URLs, and `API_SERVICE` binding against the Server Worker identity.
- Require and validate `RESEND_API_KEY` and `EMAIL_FROM` when email is enabled, including a non-placeholder production sender domain.
- Require enabled OAuth providers to have their client identifiers and secrets.
- Reject Stripe test keys and test/placeholder production price IDs when Stripe is enabled.
- Provide one named production verification command and make both Worker deploy commands run it first.

## 5. Proposed changes

1. Extend the existing Server production preflight into an exported `validateProductionConfig()` validator with injectable input for self-checks.
2. Have that validator inspect both Worker configurations and enforce the Web-to-API service boundary without adding Web D1 access.
3. Replace checked-in deployment identities and environment examples with neutral, explicit placeholders; retain only safe local-development values in development examples.
4. Make the DLQ name a Server Worker configuration value so the queue consumer and preflight use the same identity.
5. Add focused self-check cases for every mandatory failure path and document the operator setup and deployment flow.
6. Run the production validation before either Server or Web production deployment, while leaving development deploy commands unchanged.

## 6. Acceptance criteria

- Production validation fails closed for missing secrets and identities, placeholder names/domains, HTTP or localhost URLs, and mismatched Worker bindings.
- It verifies D1, R2, producer queue, DLQ, Web service binding, and public URL consistency.
- It enforces live Stripe credentials and non-test production price IDs only when billing is enabled.
- It enforces Resend credentials and a non-placeholder sender only when email is enabled, and OAuth client configuration only for enabled OAuth methods.
- Environment examples contain no real secrets or concrete deployment identities.
- The documented verification command is exercised by CI's template test and by both production deploy scripts.
- No product feature, schema, migration, routing, or provider-integration code is changed.
