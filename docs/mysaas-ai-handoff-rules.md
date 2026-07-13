# MySaaS AI Handoff Rules

Use this document when handing work to another AI agent.

The goal is to build on EasyStarter without losing the ability to merge upstream
EasyStarter updates later.

## Core Rule

Treat new product work as an extension module first.

Prefer adding code under custom/module-owned directories:

```txt
apps/server/src/custom/<module>/
apps/web/src/custom/<module>/
packages/site-modules/<module>/
```

Avoid modifying EasyStarter core unless the change is a stable extension point
or a real bug fix.

## What Counts As Core

Core files include:

- auth setup
- billing providers
- credits ledger internals
- existing EasyStarter UI primitives
- existing app-config payment semantics
- main server router
- generated route tree
- dashboard nav config
- global app config/types
- wrangler/env setup

Core edits are allowed, but they must be small and tracked.

## CUSTOMIZATIONS Requirement

If an AI modifies EasyStarter core, it must add or update an entry in:

```txt
CUSTOMIZATIONS.md
```

Entry must include:

- date
- files touched
- reason
- upstream merge risk: low / medium / high
- rollback notes
- verification command

If the AI only adds isolated extension-module files and planning docs, a
CUSTOMIZATIONS entry is optional.

## Public Read Model Work

For Neon -> JSON fixture -> D1 seed migration:

- scope is public read data only
- do not migrate auth
- do not migrate billing
- do not migrate admin
- do not add runtime Neon dependency
- do not expose secrets or D1 bindings to browser code
- seed D1 from JSON fixture
- build pages with real data first, visual polish later

Recommended module name:

```txt
public-read
```

Recommended locations:

```txt
apps/server/src/custom/public-read/
apps/web/src/custom/public-read/
```

Suggested first routes:

```txt
/
/domains
/domains/:slug
/brand-ideas
/brand-ideas/:slug
/category/:slug
```

## Module Safety

Module code can modify its own files freely.

When a module needs to connect to EasyStarter, keep core touch points predictable:

- one server router registration
- route files for public pages
- optional nav/config entry
- seed script/package script if needed

Do not scatter imports and special cases across unrelated EasyStarter files.

## Discovery Listing Work

For any Discovery list page, read:

```txt
docs/mysaas-discovery-module-spec.md
docs/mysaas-discovery-listing-plan.md
```

Use protocol + shell + resource adapter. Shared listing code may own only
layout, generic states, and small stable types. Each resource owns its Zod
schema, D1 query, filters, cards, pagination, SEO, and editorial content.
Do not build a universal config-driven list renderer.

## How Modules Become Template Improvements

A module should be promoted into the reusable template only when:

- two real sites need it, or
- one real site proves it is core to the business model, or
- it protects correctness/security, or
- it removes repeated setup work for future sites.

Before promotion:

- identify the stable common contract
- keep site-specific copy/styling/business rules outside the shared module
- add one small runnable check
- record core changes in `CUSTOMIZATIONS.md`

## Template Improvement Types

The template can get better through more than feature modules:

- shared page masters
- shared components
- layout conventions
- data fixture/seed pipeline
- import scripts
- SEO policies
- route conventions
- card/list/detail protocols
- server router extension point
- nav extension registry
- site module config
- smoke/check scripts
- documentation and prompts

## Handoff Prompt

Copy this prompt when assigning implementation work to another AI:

```text
You are working on an EasyStarter-based MySaaS template.

Read first:
- CUSTOMIZATIONS.md
- docs/mysaas-ai-handoff-rules.md
- docs/mysaas-public-read-model-migration.md
- docs/mysaas-template-evolution.md

Task context:
We are migrating public read data from Neon -> JSON fixture -> D1 seed. This is
an extension module, not a rewrite of EasyStarter core.

Hard rules:
- Treat new code as an extension module first.
- Prefer apps/server/src/custom/<module>/, apps/web/src/custom/<module>/, or
  packages/site-modules/<module>/.
- Do not migrate auth, billing, admin, or provider secrets.
- Do not add a runtime Neon dependency for public pages.
- Do not expose D1 bindings or server secrets to browser code.
- Keep EasyStarter core edits minimal and predictable.
- If you modify EasyStarter core, update CUSTOMIZATIONS.md with files touched,
  reason, upstream merge risk, rollback notes, and verification command.
- Module files can change freely, but core changes must be traceable.
- Build with real fixture data first. Visual polish comes after loader/data
  contracts are proven.
- Every non-trivial implementation must leave one small runnable check.

Preferred first module:
- public-read

Preferred first routes:
- /
- /domains
- /domains/:slug
- /brand-ideas
- /brand-ideas/:slug
- /category/:slug

Before coding, output:
1. Files you plan to add.
2. EasyStarter core files you plan to touch, if any.
3. Whether CUSTOMIZATIONS.md needs an entry.
4. D1 tables and fixture files.
5. Loader contracts.
6. Verification command.

After coding, report:
1. What changed.
2. Core files touched.
3. CUSTOMIZATIONS.md entry added or why not needed.
4. Commands run and results.
5. Remaining risks.
```
