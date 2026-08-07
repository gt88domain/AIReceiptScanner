# Phase 1D — Default-empty Public-read Runtime Extension Point

Phase 1D consumes one narrow Gate B exception: it adds only a default-empty
composition-root seam for future downstream public reads. It does not prove a
real product works; it only provides the runtime seam required for the first
downstream pilot.

## Baseline and evidence

| Item | Value |
| --- | --- |
| Phase 1C squash merge | `e928d14586d0e5c0b1df7abd75ab11272caf44d5` |
| Phase 1D base `main` | `e928d14586d0e5c0b1df7abd75ab11272caf44d5` |
| RED | `0a549d730718bad66e30acd1b1d309f5f693c9b4` |
| GREEN | `7c5bef28ff079bc03c4271fefc694e90bf3795d5` |
| ADR publication commit | `da9f619335cbd0a3cb1e0e0b147e3d52482828f1` |
| Post-GREEN synchronous-registrar hardening | `8b5f86e8676c12f44c899abe83522f18d9f148e8` |

The RED test ran `pnpm --filter server exec vitest run --config vitest.config.ts
test/public-read-registration.integration.test.ts` and failed because
`@/app/register-public-read-routes` did not exist. GREEN adds the minimal
extension point and makes the same eight integration assertions pass.

## Runtime contract

`createApp` now accepts only this optional extension input in addition to its
existing required runtime configuration:

```ts
type CreateAppOptions = {
  runtimeConfig: ServerRuntimeConfig;
  publicReadRouteRegistrars?: readonly PublicReadRouteRegistrar[];
};

type PublicReadRouteRegistrar = (app: ServerApp) => undefined;
```

The immutable default is an empty readonly array. `apps/server/src/index.ts`
continues to call `createApp({ runtimeConfig })`, so every stock EasyStarter
profile remains default-empty and exposes no Discovery route.

The fixed order is:

```txt
Core → Auth → Email → Storage → Billing → Public Read → RPC/API catch-all
```

This phase fixes only the minimal insertion point after Billing and before
`registerRpcRoutes`. It does not decide a permanent order relative to any
other optional platform surface.

`register-public-read-routes.ts` receives only `ServerApp` and synchronously
iterates explicitly supplied registrars. Every registrar must return exactly
`undefined`; async functions, Promises, `ServerApp`, and every other return
value are rejected immediately with a stable `TypeError`. Rejected thenables
are consumed only to prevent an unhandled rejection; they are never awaited or
accepted. Therefore all explicit route registration finishes before `createApp`
returns and Phase 1D provides no async plugin lifecycle. Registrars receive no runtime configuration,
environment, `createContext`, Auth, Payments, Credits, Jobs, Storage, Email,
Capabilities, D1 or provider service. It performs no automatic discovery,
filesystem scan, dynamic import, async registration, network access, or
environment-based module selection.

## Composition-root ownership

There is deliberately no global product registry and no Core import of a
downstream module. Default EasyStarter has no product registrar. A future
downstream composition root may explicitly pass its own registrar, for example
`publicReadRouteRegistrars: [registerPromptPublicReadRoutes]`; that future
product work is not part of Phase 1D.

Keeping `index.ts` unchanged proves the default. Avoiding a global registry
makes a product addition visible at its own composition root and avoids an
upstream-to-downstream import dependency.

Phase 1C still governs any eventual registrar: Hono only, downstream route
ownership, static explicit registration, request-lazy initialization,
Hono-request-only context, GET/HEAD, and an empty default registry. Its
`product-config` token remains only a public-safe, minimal, read-only
projection—not full configuration, provider secrets, price/billing, email, or
production-identity configuration.

## Tests and evidence

`apps/server/test/public-read-registration.integration.test.ts` proves:

- all four profiles (`full-saas`, `account-app`, `directory`, and
  `directory-lite`) create with no test public-read path and retain Core health;
- omitted registrars and an explicit empty array have the same representative
  Core, ordinary-miss, and API-miss surface;
- an explicitly injected test registrar runs exactly once, while no registrar
  is discovered automatically;
- its test-only `/api/__public-read-contract/probe` wins before the generic
  API catch-all, returns its own response, and a Vitest `createContext` spy
  records zero calls;
- the same spy records one call for generic `/api/healthCheck`, proving that
  the spy is effective rather than vacuous;
- a fake read Repository factory is not initialized at app construction,
  registration, Core health, or an unrelated request; each matching request
  initializes it once;
- the test route does not exist without a registrar;
- the registrar type has exactly one `ServerApp` argument; and
- its return type is exactly `undefined`, with async registrars rejected by
  TypeScript and type-escaped async/non-undefined returns rejected at runtime;
- a frozen readonly registrar array is not mutated.

The existing `runtime-composition.integration.test.ts` and
`optional-capabilities.integration.test.ts` remain the regression coverage for
profile surface, disabled Billing/Credits/Storage routes, Jobs, and the Stripe
disabled path.

## Scope and safety

Actual Phase 1D files are:

- `apps/server/src/app/create-app.ts`
- `apps/server/src/app/register-public-read-routes.ts`
- `apps/server/test/public-read-registration.integration.test.ts`
- this ADR

No product registrar, production public route, `/api/discovery/*`, List/Detail
DTO, Adapter, Schema, Migration, URL, canonical, sitemap, cache, Cloudflare
resource, D1 operation, downstream repository, or configuration/Context/RPC
change is included. The test route exists only in the integration-test process.

GitHub Rulesets and classic branch protection remain unavailable on this
private repository plan (HTTP 403). The temporary control remains an isolated
PR plus exact-HEAD `build`, `test`, `static`, and `osv` checks. No release,
deployment, Cloudflare action, or D1 action occurred.

## Gates and next step

The limited Phase 1D Gate B exception is exhausted by this seam. Gate B returns
to **No-Go** for all real product Routes, DTOs, Adapters, data, URL, cache, and
downstream work.

The next possible step is a private Prompt Dir pilot using this seam, not a
further upstream expansion. That pilot requires a separate authorization and
must decide its own path, handler, public-safe config projection, Repository,
DTO/error/cache behavior, and product rollout evidence.
