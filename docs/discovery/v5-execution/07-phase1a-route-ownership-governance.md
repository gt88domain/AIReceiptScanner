# Phase 1A — Public Route Ownership Governance

Phase 1A turns the accepted Phase 0 URL Freeze into a static test gate. It is governance/test-only: Foundation still owns no public product route, and Gate B (Runtime/Data/URL) remains No-Go.

## Scope and implementation

| File | Purpose |
| --- | --- |
| `scripts/check-discovery-route-ownership.mjs` | pure `validateRouteOwnershipFixture()` core plus local CLI over valid fixtures |
| `scripts/check-discovery-route-ownership.test.mjs` | Node built-in test coverage for every valid and invalid rule |
| `template-kit/fixtures/discovery-route-ownership/valid/*.json` | minimal frozen AIBranding and Prompt Dir evidence |
| `template-kit/fixtures/discovery-route-ownership/invalid/*.json` | deliberately invalid, local test data; never read by the CLI gate |
| `package.json` | `check:discovery-routes` and the existing `test:template` integration |

The validator is deterministic and pure: no network, environment variables, clock, GitHub API, downstream checkout, application runtime import, or `routeTree.gen.ts` parsing. The CLI only reads the repository-local `valid/` JSON files.

## Fixture contract

```json
{
  "schemaVersion": 1,
  "product": "aibranding",
  "sourceRepository": "gt88domain/aibranding-easystarter",
  "sourceCommit": "c5e2e376a20bab78d4e068a5e2b6a7668e8e73d0",
  "claims": [
    {
      "pattern": "/domains/:slug",
      "owner": "aibranding",
      "kind": "product-route",
      "status": "frozen-existing"
    }
  ]
}
```

The two valid fixture commits are fixed Phase 0 evidence, not dependency pins or routes to register. They record only conflict-relevant facts: AIBranding root/Domain/category/rankings patterns and Prompt root/typed/detail/item/ranking patterns. They do not copy a downstream route tree.

## Rules and stable error codes

| Code | Rule |
| --- | --- |
| `DISCOVERY_ROUTE_ROOT_DYNAMIC_FORBIDDEN` | `owner: "foundation"` cannot claim any root dynamic pattern, including `/:slug`, `/:type`, `/:type/:slug` or `/:seoPageSlug`. |
| `DISCOVERY_ROUTE_RESERVED_SEGMENT` | A non-frozen resource route cannot claim a platform or product-reserved first segment, including `admin`, `api` and `category`. |
| `DISCOVERY_ROUTE_NAMESPACE_UNREGISTERED` | A proposed `resource-route` must use the closed namespace registry. The registry is intentionally empty: Phase 0 approved no future namespace. |
| `DISCOVERY_ROUTE_FIXTURE_SOURCE_REQUIRED` | `sourceRepository` and a full 40-character hexadecimal `sourceCommit` are required. |
| `DISCOVERY_ROUTE_DUPLICATE_CLAIM` | Within one product fixture, the route `pattern` is the claim identity. Any second claim with that pattern fails if its owner, kind or status differs, and a fully identical proposed claim also fails. The only exception is the same product's fully identical `frozen-existing` fact. |
| `DISCOVERY_ROUTE_FIXTURE_INVALID` | `schemaVersion: 1`, non-empty `product`, `claims`, and each claim's non-empty slash-prefixed `pattern`, non-empty `owner`, closed `kind` and closed `status` are required. |

`kind` is exactly `product-route` or `resource-route`; `status` is exactly `proposed` or `frozen-existing`. Errors are sorted by code and route pattern. Existing audited product patterns pass only as `frozen-existing`; that exception records ownership and cannot turn a downstream dynamic route into a reusable Foundation pattern. Duplicate patterns are deliberately not compared across fixtures: AIBranding and Prompt Dir are independently deployed products and both may truthfully record `/:slug`.

## RED → GREEN evidence

- RED: `115896dbf166e067fe0f530b154be343daed3ac2` — `test(discovery): define route ownership invariants`. `node --test scripts/check-discovery-route-ownership.test.mjs` failed with `ERR_MODULE_NOT_FOUND` because the validator did not yet exist.
- GREEN: `fcf58635d307fa7d1084e8cb22a01b7a42430782` — `test(discovery): enforce route ownership invariants`. The CLI and six tests pass after the minimal validator is added.
- Post-GREEN hardening: `103bd4783ebd35216733e05a0147ce160a708c1e` — `test(discovery): harden route claim identity`. Route pattern is now the single-fixture identity; shape checks and conflicting owner/kind/status coverage were added without rewriting RED or GREEN history.

## Boundary after Phase 1A

Gate A is used only for this governance check. No Discovery Server Module, endpoint, Hono/oRPC router, List/Detail DTO, Adapter, Schema, Migration, public Web route, Cloudflare resource, D1 operation, sitemap change, or downstream change is created here. The next phase is not automatically authorized; any future work needs its own approved scope and PR.
