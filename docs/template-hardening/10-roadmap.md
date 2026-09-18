# 10 — Hardening roadmap

## Delivery model

Phase 0 is one documentation-only PR: `hardening/audit`. It must be reviewed
before any implementation starts. Each later item is a separate branch and PR,
rebased normally onto current `main`; never force-push `main`, rewrite merged
history, or merge a product branch into this template.

## Ordered PR plan

| Order | Branch / PR | Scope | Exit criteria |
| --- | --- | --- | --- |
| 0 | `hardening/audit` | These ten audit documents only | Review confirms architecture, risks, and order; no runtime diff |
| 1 | `hardening/security-config` | Adopter-owned identity/configuration checklist and deployment guard gaps | Cannot deploy with unresolved template identity; no real secrets committed |
| 2 | `hardening/jobs-system` | Job vocabulary, registration/Worker-path tests, DLQ operations and alert/runbook contract | Queue/DLQ/job lifecycle proven without a product handler |
| 3 | `hardening/assets` | Asset transport/policy hardening and raw-key boundary tests | All new product files use `asset.id` and authorization service |
| 4 | `hardening/capabilities` | Capability registry conventions and server enforcement proof | Configured capability allows/denies correctly; no plan-string checks |
| 5 | `hardening/audit-log` | Audit action contract and privileged-mutation test pattern | Successful admin recovery/mutation is safely auditable |
| 6 | `hardening/testing` | Fill the remaining focused server test gaps only | Required gates cover added contracts without broad UI rewrite |
| 7 | `hardening/examples` | Minimal product-neutral reference snippets/docs after foundations stabilize | Examples are generic and contain no product business behavior |

`hardening/security-config` and `hardening/jobs-system` are P0. The remaining
items are P1 unless a real product migration exposes a specific blocker.

## Merge requirements for every implementation PR

1. One capability, coherent diff, no unrelated formatting or product code.
2. Schema and migration changes, if any, are structural-only and include their
   generated Drizzle artifacts.
3. Focused tests and documentation land in the same PR.
4. `pnpm install --frozen-lockfile`, lint, types, template/integration tests,
   migration check, and build pass locally where applicable.
5. GitHub `verify` and `osv` are green before a normal merge into `main`.
6. Production resource configuration is filled only by the authorized operator;
   no fake secrets or production data appear in the repository.

## Explicit stop condition

After the audit PR is reviewed, choose the next isolated PR deliberately. Do
not begin an AI SaaS, directory, content, marketplace, community, generator,
or data-migration implementation directly from this roadmap.
