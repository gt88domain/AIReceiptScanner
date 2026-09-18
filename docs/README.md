# Documentation index

Use current operating documents for implementation and production work. Treat
historical records as dated evidence, not as instructions for the current tree.

## Start here

- [Repository map](./repo-map.md): where common changes belong and which files
  are authoritative.
- [Architecture map](./architecture-map.md): Worker topology, dependency
  direction, and critical sequences.
- [Module and feature TODO](./module-feature-todo.csv): current product-adoption,
  slug, security, performance, simplification, and documentation decisions in
  sortable CSV form.
- [Template adoption](./template-adoption.md): turn the template into a new
  product without copying preview identities.
- [New-project checklist](./new-project-checklist.md): content, branding, and
  capability decisions before launch.
- [Golden Paths](./golden-paths/): minimal implementation paths for common
  product types and platform extensions.

## Architecture and governance

- [Normative repository instructions](../AGENTS.md), the stable
  [governance pointer](../GOVERNANCE.md), and
  [architecture boundaries](./architecture-boundaries.md)
- [Tooling governance](./tooling-governance.md): active checks, archived skills,
  and the guarded object owned by each script
- [Platform composition](./platform-composition.md) and
  [platform modules](./modules.md)
- [Configuration architecture](./config-architecture.md)
- [oRPC and Worker boundaries](./orpc-worker-boundaries.md)
- [Async reliability](./async-reliability.md),
  [Jobs](./jobs-optional.md), and [rate limiting](./rate-limiting.md)
- [Storage and assets](./storage-optional.md)
- [Authorization](./admin-access.md),
  [billable operations](./billable-operations.md), and
  [testing strategy](./testing-strategy.md)
- [ADR index](./adr/README.md)

## Adoption, data, and release operations

- [Product profiles](./product-profiles.md)
- [Product-owned ledger](./product-owned-ledger.md)
- [Migration guide](./migration-guide.md) and ordered
  [migration playbook](./migration/00-audit.md)
- [Production configuration](./production-configuration.md) and
  [production migrations](./production-migrations.md)
- [D1 backup and recovery](./d1-backup-recovery.md)
- [Template governance](./template-governance.md),
  [upstream sync](./upstream-sync.md), and [upgrade guides](./upgrades/)
- [Upgrade from v3.1.2 to v4.0.0](./upgrades/v3.1.2-to-v4.0.0.md): breaking
  changes, downstream adoption order, provider/i18n recovery, and rollback

## Web, content, and localization

- [i18n implementation](./i18n-implementation.md)
- [Email capabilities](./email-capabilities.md)
- [Public-form abuse controls](./rate-limiting.md)
- Product-owned blog/docs content lives under `apps/web/content`; each content
  directory contains its own README.

## Optional mobile

- [Mobile package](./mobile-package.md)
- [RevenueCat payments](./native-revenuecat-payments.md)
- [Local native builds](./native-local-builds.md)
- [Email verification with ngrok](./native-email-verification-with-ngrok.md)
- [Stripe and RevenueCat cross-platform scenarios](./cross-platform-payment-test-scenarios.md)

## Historical and task-specific records

The following material is intentionally retained but is not current operating
guidance:

- `docs/audits`: repository state at a named date and commit.
- `docs/template-hardening`: completed planning/audit phases.
- `docs/upgrades`: instructions for a particular released version transition.
- Versioned rollout and migration records such as `auth-v0410-rollout.md`,
  `money-operations-v0.4.9.md`, and `migration/mobile-package-refactor.md`.
- Point-in-time audits such as `better-auth-schema-audit-v1.6.26.md` and
  `security-config-audit.md`.
- Versioned performance records under `docs/performance` and upstream dry-run
  evidence under `docs/upstream`.
- `docs/prompts`: task handoff prompts; contents may refer to a specific branch
  or historical tree.
- `docs/candidates`: design candidates, not accepted architecture contracts.
- `docs/plans`: change-local implementation and deferred verification plans.

When a historical statement conflicts with executable configuration or source,
the current source wins unless the document is the migration record for the
historical operation being investigated.
