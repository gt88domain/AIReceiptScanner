# CUSTOMIZATIONS

This file records intentional MySaaS changes on top of EasyStarter upstream.

Use it for anything that changes EasyStarter core, extension points, shared
module behavior, or template process. Do not record ordinary site content edits.

## Baseline And Difference Map

This repository starts from the unpacked EasyStarter snapshot imported on
2026-07-13. The archive did not retain an upstream Git commit, so this file is
the initial authoritative comparison record. Before synchronizing upstream,
add the official EasyStarter remote and identify its matching release or commit.

### Runtime Differences From EasyStarter

| Area | MySaaS difference | Upstream impact |
| --- | --- | --- |
| `apps/web/src/custom/discovery/` | New optional Discovery UI module: listing shell, standard facet rail, load-more control, and small UI protocol types. | No upstream counterpart; low-risk additive directory. |
| `apps/web/src/routes/*` | No Discovery route added. | No difference. |
| `apps/server/src/*` and D1 migrations | No router, schema, seed, loader, or D1 table added. | No difference. |
| `packages/*`, auth, billing, credits, providers | No changes. | No difference. |
| Root architecture and planning docs | MySaaS extension rules and migration plans added. | Process-only; no runtime impact. |
| `.gitignore` | Ignore app build outputs. | Source-control hygiene only. |

### Custom Discovery Module Contract

`apps/web/src/custom/discovery/listing/` is reusable presentation code, not a
generic data engine. It owns the page frame, mobile filter drawer, category
icon grid, parent-triggered child categories, native select rows, collapsed tag
cloud, toolbar, states, grid, and Load More command.

Each future resource owns its own `resources/<resource>/` adapter: route search
schema, URL state, D1/API loader, taxonomy values, cards, pagination strategy,
SEO, and editorial blocks. No resource may add those concerns to the shared
listing module without first proving real reuse.

### Explicitly Unchanged Core Areas

- no EasyStarter auth, billing, credits, provider, or dashboard internals
- no public route or navigation entry
- no D1 schema, migration, seed, oRPC router, or server secret
- no new dependency

## How To Record A Change

Each entry should include:

- date
- files touched
- reason
- upstream merge risk: low / medium / high
- rollback notes
- verification command

Template:

```md
## YYYY-MM-DD - Change title

- Files:
- Reason:
- Upstream merge risk:
- Rollback:
- Verification:
```

## Current Planning Docs

These docs are MySaaS planning additions. They do not modify EasyStarter
runtime behavior.

- `docs/mysaas-extension-brief.md`
- `docs/mysaas-ai-handoff-rules.md`
- `docs/mysaas-template-evolution.md`
- `docs/mysaas-page-targets.md`
- `docs/mysaas-discovery-module-spec.md`
- `docs/mysaas-discovery-listing-plan.md`
- `docs/mysaas-public-read-model-migration.md`
- `ARCHITECTURE.md`
- `MODULES.md`
- `DATA_FLOW.md`
- `DECISIONS.md`
- `TEMPLATE_PROMPTS.md`
- `apps/README.md`
- `apps/web/README.md`
- `packages/README.md`
- `packages/app-config/README.md`
- `packages/i18n/README.md`
- `packages/shared/README.md`

## 2026-07-12 - Add Custom Discovery Listing Layer

- Files: `apps/web/src/custom/discovery/README.md`,
  `apps/web/src/custom/discovery/listing/*`,
  `docs/mysaas-discovery-listing-plan.md`
- Reason: add an isolated protocol + shell + resource-adapter foundation for
  future public Discovery lists without coupling cards, D1 queries, or SEO
  rules to EasyStarter core.
- Upstream merge risk: low
- Rollback: remove `apps/web/src/custom/discovery/`; no EasyStarter core file,
  route, server router, or app config depends on it.
- Verification: `pnpm -F web lint` and targeted `oxfmt --check`; run the full
  web typecheck after the existing server declaration issue is resolved.

## 2026-07-13 - Add Standard Public Discovery Filter Shell

- Files: `apps/web/src/custom/discovery/listing/listing-facet-rail.tsx`,
  `apps/web/src/custom/discovery/listing/listing-load-more.tsx`,
  `apps/web/src/custom/discovery/listing/listing-frame.tsx`,
  `apps/web/src/custom/discovery/listing/listing-types.ts`,
  `apps/web/src/custom/discovery/README.md`,
  `docs/mysaas-discovery-listing-plan.md`, `DECISIONS.md`
- Reason: capture the proven AI Branding category/subcategory, native-select,
  tag-cloud, and incremental-load layout as a card- and data-agnostic default
  for future public Discovery resources.
- Upstream merge risk: low
- Rollback: remove the two custom listing components and their type additions;
  no EasyStarter core file, route, server router, data schema, or app config
  depends on them.
- Verification: `pnpm -F web lint`, `pnpm -F web fmt:check`, and
  `pnpm -F web build`.

## 2026-07-13 - Initialize Independent Template Repository

- Files: `.gitignore`, `CUSTOMIZATIONS.md`
- Reason: preserve the EasyStarter snapshot and MySaaS extension history in a
  standalone repository; exclude reproducible web build output and local Expo
  device state from commits.
- Upstream merge risk: low
- Rollback: remove the repository metadata only if abandoning this standalone
  clone; keeping the `.gitignore` entry is harmless for normal development.
- Verification: `git status --ignored --short` and `git ls-files` after the
  initial baseline commit.

## Recommended Future Core Changes

These are not implemented yet. Add a dated entry above when one is implemented.

- Add `siteModules` config for optional modules.
- Add one custom server router mount.
- Add one custom navigation extension point.
- Add a web/server boundary check after functional code changes begin.
- Keep public read models isolated from auth, billing, admin, and provider
  internals.
