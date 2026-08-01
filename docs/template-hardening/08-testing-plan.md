# 08 — Testing plan

## Current required gates

`pnpm test` runs `pnpm test:template` and `pnpm test:integration`.
GitHub `quality.yml` additionally runs a frozen install, lint, format check,
types, Expo doctor, `pnpm db:check`, and build. `osv-scanner.yml` scans the
pnpm lockfile on pull requests and weekly.

| Concern | Current proof |
| --- | --- |
| Auth/admin | unit guards and integration ordinary/admin/paid-user denial paths |
| Billing/webhooks | entitlement config plus event idempotency/replay tests |
| Credits | ledger/order/dispute/billable-operation integration tests |
| Migrations | every structural migration applies to isolated D1 before integration tests |
| Jobs | registry/retry unit tests and idempotency/DLQ integration tests |
| Assets | authorized read/delete integration test |
| Production guard | self-check for production safety parser/validation |

## Gaps and priorities

| Priority | Gap | Planned response |
| --- | --- | --- |
| P0 | No test of the complete Worker queue entrypoint, startup handler registration, and operational DLQ routing | `hardening/jobs-system` |
| P1 | Asset tests do not prove a public asset transport, raw-key-route boundary, or repair behavior | `hardening/assets` |
| P1 | Capability integration proof has no enabled generic capability fixture | `hardening/capabilities` |
| P1 | Audit tests focus on redaction; no reusable successful-mutation policy test | `hardening/audit` |
| P2 | No browser E2E/live Cloudflare smoke test | Decide separately; do not add broad UI snapshots by default |

## Rules for every hardening PR

- Add the smallest test that fails if the newly claimed behavior regresses.
- Keep money, auth, webhooks, admin, migrations, jobs, assets, and capability
  tests server-side and deterministic.
- Never make a test pass by disabling a production check, weakening a guard, or
  adding a real external provider credential.
- Documentation-only PRs require `git diff --check`; code PRs run the relevant
  focused test and the full required CI gate before merge.

UI and marketing tests remain optional because this mission is template
infrastructure, not a frontend rewrite.
