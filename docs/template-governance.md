# Template governance

`GOVERNANCE.md` is the concise root entry point for contributors and AI agents.
This document provides the operational detail for that policy.

EasyStarter is a governed upstream template, not a product. Its job is to keep
the infrastructure that every downstream SaaS relies on stable, secure, and
easy to upgrade.

## Template-owned surface

The template owns shared infrastructure and its contracts:

- authentication, authorization, and security utilities;
- D1 schema/migrations, storage abstractions, jobs, billing, and credits;
- Worker/API boundaries, deployment rules, CI, and shared packages;
- template documentation, ADRs, and release/versioning policy.

Changes here require a focused PR, maintainer review, tests, and a template
version bump. A product may propose a core improvement, but must not silently
specialize core behavior for one product.

## Product-owned surface

Products own their business domains under `apps/server/src/modules/<domain>`
and `apps/web/src/modules/<domain>`.

Examples include a domain marketplace and logo generation for AIBranding,
provider-specific generation workflows for an AI Generator, and a game catalog
or runtime for an HTML5 product. Product code may consume core contracts but
does not change their meaning.

## Change decision

1. Is this reusable infrastructure required by more than one product? If not,
   create a product module.
2. Does the change alter a public template contract or architecture boundary?
   Add or update an ADR and bump `template-version.json`.
3. Does it affect auth, money, data, jobs, storage, or deployment? Add focused
   tests and request template-maintainer review.

See [architecture boundaries](./architecture-boundaries.md) for dependency
rules and [upstream sync](./upstream-sync.md) for downstream update workflow.

## Template versioning

`template-version.json` uses semantic versions. Bump PATCH for compatible bug
fixes, MINOR for a new optional capability, and MAJOR for a breaking
architecture or contract change. Every architectural change records its reason
in an ADR and bumps this version in the same PR.
