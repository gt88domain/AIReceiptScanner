## Why

EasyStarter is intended to be the maintained base for paid products operated by
one person. The current v2.6 baseline has sound payment, entitlement, Jobs, and
deployment foundations, but its launch checklist is not yet reliable enough to
drive future work without another source audit:

- `docs/module-feature-todo.csv` declares 17 columns while every data row has
  16, so imported columns are shifted.
- Several evidence paths and dependency IDs are stale.
- The public site still publishes Chinese and Japanese routes even though the
  first launch is now explicitly English-only; Japanese also uses the invalid
  `jp` hreflang value.
- Email OTP is represented in browser configuration and UI but has no server
  plugin, creating a dormant configuration trap.
- Private-route indexing rules are duplicated and incomplete.
- The normal production deploy is guarded, but `deploy:dev` can call the
  default Wrangler configuration without the production preflight.
- The repository has no current D1 backup and recovery runbook.

This change prepares a small, reviewable hardening sequence before downstream
product work resumes.

## What Changes

- Repair the module TODO CSV schema, evidence paths, dependencies, statuses,
  and decisions against the current v2.6 tree.
- Make the paid-product baseline opt out of automatic signup credits and
  default subscription trials while retaining `free` only as the internal
  no-paid-entitlement state.
- Make English the only published launch locale while retaining a deliberate
  path for future localization.
- Remove the unused half-implemented email OTP surface instead of completing a
  feature that is not required.
- Unify non-public route classification for response headers, robots,
  sitemap, and prerender filtering.
- Remove or isolate the unguarded `deploy:dev` path while preserving the
  dedicated preview deployment.
- Add a minimal D1 backup/recovery runbook suitable for a solo operator.
- Keep Admin Analytics, optional Mobile, Assets, and Tickets as existing
  bounded capabilities; Tickets remains disabled for the default launch and
  support uses email.
- Review implementation against the core goals before authoring tests, then
  add the smallest focused checks in one test phase. Do not execute tests or
  builds without an explicit user request.

## Capabilities

### New Capabilities

- `solo-paid-template-baseline`: A reliable English-first, paid-product
  template baseline with accurate planning data and bounded launch safety.

### Modified Capabilities

- Documentation truth and planning data
- Public locale publication and SEO indexing controls
- Authentication method composition
- Production deployment guardrails
- Solo-operator data recovery documentation

## Impact

- Documentation and planning: `docs/module-feature-todo.csv`, `docs/plans`,
  current operating guides, and template baseline metadata.
- Web: locale publication, sitemap/hreflang generation, locale switching, and
  non-public indexing rules.
- Server/Auth: removal of dormant email OTP configuration and supporting code.
- Operations: package deployment scripts and a D1 recovery runbook.
- No downstream repository, production resource, secret, database, migration,
  deployment, or external service is changed by this proposal.

## Non-Goals

- Do not work on HTML5.ai, AIAnswers, or any other downstream repository.
- Do not add account purge/export, session dashboards, 2FA, passkeys, RBAC,
  teams, or a full staging environment.
- Do not add CodeGraph, a generated repo map, a plugin system, a central
  control plane, or a generic module registry.
- Do not choose or integrate a new payment provider, automate tax/invoices, or
  expand the number of launch payment models.
- Do not physically delete optional Mobile, Tickets, Assets, or Admin
  Analytics merely because the default product does not use them.
- Do not add tests before the implementation and core-goal review checkpoint.
- Do not run tests, builds, deployments, migrations, or secret operations
  unless the user explicitly authorizes them in the implementation task.
