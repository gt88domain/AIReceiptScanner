# Phase 1C — Public-read Registration Extension-point Contract

Phase 1C is a Gate A governance/test contract. It specifies what a future anonymous public-read registration proposal must declare; it does **not** implement a registrar, route, handler, or runtime interface. Gate B (Runtime/Data/URL) remains No-Go.

## Baseline and evidence

| Item | Value |
| --- | --- |
| Base `main` | `8a0a1dec7896c116e220ed4d3940072a283fe8c4` |
| Phase 1B PR #55 squash merge | `8a0a1dec7896c116e220ed4d3940072a283fe8c4` |
| Phase 1C RED | `ff2d927ce74fa9220ad70c59c01f95fe002fb0f8` |
| Phase 1C GREEN | `e682e970998b370b30c374131a405ba322efeec2` |

The RED test failed with `ERR_MODULE_NOT_FOUND` before the validator existed. GREEN adds only a pure validator and makes the fixture/test contract pass.

The audited application order is `registerCoreRoutes`, Auth, Email, Storage, Billing, then `registerRpcRoutes`. `registerRpcRoutes` creates full `createContext()` instances for `/rpc/*` and `/api/*`; that context reaches Auth Session, Storage, Email, Payments, Entitlements, Capabilities, Jobs, and Credits. Existing Email routes are the narrow counterexample: capability-gated specific paths are registered before the generic API catch-all and instantiate Email only inside the matching handler. This evidence constrains a future proposal but does not authorize changing `create-app.ts`.

## Fixed governance fixture

`template-kit/fixtures/discovery-public-read-registration/valid/minimal-registration.json` is intentionally not a router DSL and contains no path, route, pattern, namespace, canonical, redirect, endpoint, handler, module, or TypeScript symbol.

```json
{
  "schemaVersion": 1,
  "product": "candidate-directory",
  "operation": "public-read-registration",
  "transport": "hono",
  "mountBefore": "before-rpc-api-catchall",
  "routeOwner": "downstream",
  "registrationMode": "static-explicit",
  "initializationMode": "request-lazy",
  "contextMode": "hono-request-only",
  "methods": ["GET"],
  "dependencies": ["d1", "read-repository", "product-config", "request-log", "request-id"],
  "defaultRegistry": []
}
```

The top-level shape is closed. Its only fields are `schemaVersion`, `product`, `operation`, `transport`, `mountBefore`, `routeOwner`, `registrationMode`, `initializationMode`, `contextMode`, `methods`, `dependencies`, and `defaultRegistry`. Unknown fields, including all route-bearing names, are fixture-invalid.

## Fixed contract

| Concern | Only accepted value | Decision |
| --- | --- | --- |
| Transport | `hono` | Hono is the future transport boundary. `orpc`, `rpc`, OpenAPI handlers, framework auto-registration, dynamic plugins, and unknown transports are not valid anonymous-read proposals. |
| Mount order | `before-rpc-api-catchall` | A future specific public-read mount must precede `registerRpcRoutes(app, runtimeConfig)`. This phase does not decide its order relative to Email, Storage, or Billing. |
| Route ownership | `downstream` | Foundation owns only the extension-point contract; products own concrete paths and must still pass the Phase 1A ownership gate. |
| Registration mode | `static-explicit` | Future imports and registrar inputs must be explicit. Filesystem/glob/network/environment/dynamic-import/plugin discovery is prohibited. |
| Initialization mode | `request-lazy` | App and registration phases create no Repository or service. Only a matching public-read request may access `c.env.DB` and create a product read Repository. |
| Context mode | `hono-request-only` | A future handler may use native Hono request context, request headers/ID/logging, D1, a read Repository, and a public-safe config projection. It must not require `createContext()` or any Auth, user, Payments, Credits, Entitlements, Jobs, Storage, or Email service. |
| Methods | `GET`, optional `HEAD` | Methods are non-empty, unique, uppercase, and limited to safe reads. |
| Default registry | `[]` | Discovery is optional. Ordinary EasyStarter profiles register no Discovery route by default. |

`product-config` has a deliberately narrow meaning: a **public-safe, minimal, read-only product configuration projection**. It must never inject the full product configuration, provider secrets, price/billing configuration, email configuration, production identity configuration, or another secret-bearing configuration object. How that projection is generated is deferred to a future Runtime ADR.

No API path is fixed here. In particular, `/api/discovery/*` is not approved. The absence of path fields prevents Foundation from silently acquiring product URL ownership.

## Phase 1B reuse

`scripts/check-discovery-public-read-registration.mjs` imports and projects `product` plus `dependencies` into `validatePublicReadDependencyFixture()`:

```js
validatePublicReadDependencyFixture({
  schemaVersion: 1,
  product: fixture.product,
  operation: "public-read",
  dependencies: fixture.dependencies,
});
```

It does not copy a second dependency allow-list. Therefore Phase 1B remains the single authority for `d1`, `read-repository`, `product-config`, `request-log`, and `request-id`, and for its fixture-invalid, forbidden, and duplicate error semantics.

## Error codes

| Code | Rule |
| --- | --- |
| `DISCOVERY_PUBLIC_READ_REGISTRATION_FIXTURE_INVALID` | Closed shape, required fields, operation, transport, and route-bearing-field prohibition. |
| `DISCOVERY_PUBLIC_READ_REGISTRATION_ORDER_INVALID` | Mount is not before the RPC/API catch-all. |
| `DISCOVERY_PUBLIC_READ_REGISTRATION_ROUTE_OWNER_INVALID` | Owner is not downstream. |
| `DISCOVERY_PUBLIC_READ_REGISTRATION_MODE_INVALID` | Registration is not static and explicit. |
| `DISCOVERY_PUBLIC_READ_REGISTRATION_INITIALIZATION_INVALID` | Initialization is not request-lazy. |
| `DISCOVERY_PUBLIC_READ_REGISTRATION_CONTEXT_INVALID` | Context is not native Hono request-only. |
| `DISCOVERY_PUBLIC_READ_REGISTRATION_METHOD_FORBIDDEN` | Method is not uppercase `GET` or `HEAD`. |
| `DISCOVERY_PUBLIC_READ_REGISTRATION_METHOD_DUPLICATE` | A method occurs more than once. |
| `DISCOVERY_PUBLIC_READ_REGISTRATION_DEFAULT_REGISTRY_NOT_EMPTY` | The default registry declares an entry. |
| `DISCOVERY_PUBLIC_READ_FIXTURE_INVALID` | Inherited Phase 1B dependency-fixture failure. |
| `DISCOVERY_PUBLIC_READ_DEPENDENCY_FORBIDDEN` | Inherited Phase 1B dependency allow-list failure. |
| `DISCOVERY_PUBLIC_READ_DEPENDENCY_DUPLICATE` | Inherited Phase 1B duplicate dependency failure. |

Errors sort by code, then their field/method/dependency subject. The CLI reads only local `valid/*.json`; malformed JSON propagates as a failure and an empty valid directory fails explicitly.

## Actual files

- `scripts/check-discovery-public-read-registration.mjs`
- `scripts/check-discovery-public-read-registration.test.mjs`
- `template-kit/fixtures/discovery-public-read-registration/valid/minimal-registration.json`
- `docs/discovery/v5-execution/09-phase1c-public-read-registration-extension-point.md`
- `package.json` (new check command and existing `test:template` integration only)

## Non-binding future sketch

The following is explanatory pseudocode, not an interface, export, file, or approved API:

```txt
registerPublicReadRoutes(app, registrars, publicSafeConfig)
```

Any future Runtime PR must separately prove create-app ordering, zero routes when no registrar is configured, zero dependency initialization for unmatched requests, request-lazy initialization of only Phase 1B-approved dependencies for a matching route, no `createContext()` call, and a green Profile Matrix. It must also decide the real function name/signature, registrar storage, public-safe config projection, paths, DTOs, errors, cache behavior, adapters, and downstream migration.

## Explicit non-goals and open decisions

This phase changes no `create-app.ts`, `register-*.ts`, context, runtime config, module registry, endpoint, handler, router, DTO, Adapter, Schema, Migration, URL, canonical, sitemap, cache, Cloudflare resource, D1 operation, or downstream repository. It does not decide List/Detail contracts, pagination, FTS5, Admin/Import, AIBranding transport, Prompt Dir transport, or Cloudflare staging.

GitHub Rulesets and classic Branch Protection remain unavailable for this private repository's current plan (both APIs return HTTP 403); PR review plus exact-HEAD green CI remains the temporary process control. This limitation does not grant a runtime exception.

- **Gate A — Governance/Test:** Phase 1C is test/ADR-only and awaits review.
- **Gate B — Runtime/Data/URL:** No-Go.

No next phase is automatically authorized.
