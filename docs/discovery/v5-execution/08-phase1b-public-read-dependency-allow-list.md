# Phase 1B — Public-read Dependency Allow-list

Phase 1B is a Gate A governance/test check. It defines what an eventual anonymous Discovery read may initialize; it does **not** register, transport, or execute one. Gate B (Runtime/Data/URL) remains No-Go.

## Decision

The fixture vocabulary is closed. An eventual public-read proposal may declare only these dependency tokens:

| Token | Meaning |
| --- | --- |
| `d1` | D1 binding for the read path |
| `read-repository` | product-owned, pure read Repository |
| `product-config` | minimum product configuration |
| `request-log` | request-scoped logging |
| `request-id` | request correlation identifier |

Every other token fails `DISCOVERY_PUBLIC_READ_DEPENDENCY_FORBIDDEN`. This deliberately includes `auth-session`, `payments`, `credits`, `entitlements`, `jobs`, `user-storage`, and `email-notification-write`. The check permits a subset of the allow-list; it does not require an implementation to initialize an otherwise unnecessary dependency.

The tokens are governance fixture values, not DI keys, capabilities, imports, runtime modules, or a registration API. They set the minimum review boundary for a later, separately approved runtime proposal.

## Fixture and gate

`template-kit/fixtures/discovery-public-read-dependencies/valid/minimal-read.json` is a local governance fixture:

```json
{
  "schemaVersion": 1,
  "product": "candidate-directory",
  "operation": "public-read",
  "dependencies": ["d1", "read-repository", "product-config", "request-log", "request-id"]
}
```

`scripts/check-discovery-public-read-dependencies.mjs` is deterministic and pure. It reads only local valid JSON fixtures; it has no network, environment, clock, application-runtime, downstream-checkout, database, or Cloudflare dependency.

`pnpm check:discovery-public-read-dependencies` validates the fixture and `pnpm test:template` runs both that gate and its Node test file. The test coverage proves every allowed token, every named forbidden default, unknown dependencies, duplicate declarations, invalid fixture shape, and stable error order.

| Code | Rule |
| --- | --- |
| `DISCOVERY_PUBLIC_READ_FIXTURE_INVALID` | `schemaVersion: 1`, non-empty `product`, `operation: "public-read"`, and a string dependency array are required. |
| `DISCOVERY_PUBLIC_READ_DEPENDENCY_FORBIDDEN` | A dependency is outside the exact allow-list. |
| `DISCOVERY_PUBLIC_READ_DEPENDENCY_DUPLICATE` | A dependency is declared more than once. |

## RED → GREEN evidence

- RED: `a1ff0e674567e117cd68d0d46e20fb484dd818f2` — `test(discovery): define public-read dependency boundary`. `node --test scripts/check-discovery-public-read-dependencies.test.mjs` failed with `ERR_MODULE_NOT_FOUND` because the validator did not exist.
- GREEN: `514b3b743ab5935d33eca5828b7022a7056e0fec` — `test(discovery): enforce public-read dependency boundary`. The minimal validator, CLI gate, and five Node tests pass.

## Explicit non-goals

This phase creates no Hono or oRPC endpoint, no server registration point, no `create-app.ts` change, no Context change, no shared List/Detail DTO, no Adapter, no Schema or Migration, no route/canonical/sitemap change, no downstream transport migration, and no Cloudflare/D1 operation. It does not alter AIBranding or Prompt Dir.

## Repository enforcement status

At this phase's audit date, the private repository's GitHub plan rejects both the Rulesets API and classic branch-protection API with HTTP 403: GitHub requires GitHub Pro or a public repository. The desired required-PR, required-`build`/`test`/`static`/`osv`, no-force-push policy is therefore not technically enforceable in this repository until the plan or visibility changes. This ADR does not weaken the policy or modify workflows; the PR/CI process remains the temporary control.
