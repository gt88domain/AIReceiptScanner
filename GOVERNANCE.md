# EasyStarter governance

EasyStarter is a maintained upstream platform template. It provides generic
infrastructure; downstream repositories own product behavior.

## Ownership classes

### Upstream core

Core includes the auth adapter and guards, D1 and migration lifecycle, Worker
and API boundaries, payment/entitlement and credits foundations, Jobs/DLQ,
asset authorization, shared workspace packages, production safety, CI, and
release contracts. Core is generic and never imports product code.

### Upstream platform modules

Billing, credits, storage, Jobs, admin, and native are source-controlled,
optional capabilities. A disabled module hides its entry points, rejects or
no-ops safely at the server boundary, and never deletes ordered migration
history or production data. They are not runtime plugins.

### Downstream product modules

Business domains belong in `apps/server/src/modules/<domain>` and
`apps/web/src/modules/<domain>`. Product modules may consume public core
contracts, but do not change core semantics or embed product conditions in core.

## Required change process

1. Read the [baseline audit](docs/audits/upstream-governance-baseline.md) and
   [architecture boundaries](docs/architecture-boundaries.md).
2. Identify the ownership class. Prefer a product module or existing static
   extension point before editing core.
3. Give each core or public-contract change a focused PR, tests, and an ADR
   when it is a durable architectural decision.
4. Run `pnpm docs:facts-check`, `pnpm check:boundaries`, and the normal
   verification commands before review. Repository facts and mechanically
   enforced import rules are defined only in `template-kit/repository-facts.json`.

See [template governance](docs/template-governance.md) for versioning and
[upstream sync](docs/upstream-sync.md) for the current downstream update flow.
