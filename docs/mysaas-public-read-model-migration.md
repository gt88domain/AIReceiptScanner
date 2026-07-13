# MySaaS Public Read Model Migration

This document defines the first migration path for turning real public data into
EasyStarter pages without migrating auth, billing, admin, or provider internals.

## Recommendation

Your proposed migration is correct:

1. Export a small public dataset from Neon to JSON fixtures.
2. Seed D1 with only public read-model tables.
3. Build ugly-but-real public pages first.
4. Validate fields, copy length, JSON shape, joins, and missing aggregates.
5. Apply the new visual system after the data contract is stable.

This is the lowest-risk path because it makes real data visible before design
polish and before migrating private product systems.

## Current First Slice

Target fixture size:

- 36 domains
- 21 categories
- 36 brand ideas

Target public routes:

- `/`
- `/domains`
- `/domains/brandforge-ai`
- `/brand-ideas`
- `/brand-ideas/cebadi-com`
- `/category/AI`

Scope exclusions:

- no auth migration
- no billing migration
- no admin migration
- no server-secret/provider migration
- no write workflows
- no private Neon runtime dependency from public pages

## Migration Options

### Option A: JSON Fixture To D1 Seed

Flow:

```txt
Neon -> JSON fixture -> D1 seed -> public loaders -> pages
```

Pros:

- fastest to validate UI against real data
- no runtime dependency on Neon
- safe for public-only data
- easy to review fixture shape in git
- good for template demos and test fixtures

Cons:

- not live sync
- must re-export when source data changes
- fixture needs PII/secret review

Best for:

- first migration slice
- public pages
- route/data contract validation

Recommendation: use this first.

### Option B: Direct Neon Runtime Reads

Flow:

```txt
EasyStarter server -> Neon read-only connection -> public pages
```

Pros:

- data stays live
- no export/seed cycle
- useful if Neon remains source of truth

Cons:

- adds server runtime dependency
- requires connection/secret handling
- can leak old schema assumptions into new app
- harder to ship as a reusable D1-first template
- not suitable for static fixture-driven design work

Best for:

- temporary comparison tools
- migration validation dashboards
- cases where D1 is not the target store

Recommendation: avoid for the first public page migration.

### Option C: Dual-Write Or Sync Pipeline

Flow:

```txt
Neon -> export/sync job -> D1 public tables -> EasyStarter pages
```

Pros:

- keeps public D1 data fresh
- D1 remains read-optimized serving layer
- can evolve into a production import pipeline

Cons:

- more moving parts
- sync correctness matters
- needs job scheduling, idempotency, and monitoring
- too much before the public read model is proven

Best for:

- after the public D1 schema is stable
- recurring imports
- production directory/listing data

Recommendation: second phase if needed.

### Option D: Full System Migration

Flow:

```txt
Neon auth/billing/admin/public data -> EasyStarter replacement
```

Pros:

- one final system

Cons:

- highest risk
- mixes public UI, auth, money, admin, and schema decisions
- hard to debug
- likely to break EasyStarter upstream compatibility

Best for:

- later, after public pages and product modules are stable

Recommendation: do not do this now.

## Data To Export

Public read-model tables only:

- `domains`
- `domain_tags`
- `domain_tag_map`
- `brand_ideas`
- `logos`
- `seo_templates`
- `inquiries`, optional
- `newsletter`, optional

The first fixture should exclude private, billing, auth, and admin data.

Before committing JSON fixtures:

- remove emails unless explicitly public/test data
- remove IP addresses
- remove user IDs
- remove payment/customer IDs
- remove private notes
- check image/logo URLs are public-safe

## Fixture Shape

Recommended folder:

```txt
apps/server/src/custom/public-read/fixtures/
```

Recommended files:

```txt
domains.json
categories.json
domain-tags.json
domain-tag-map.json
brand-ideas.json
logos.json
seo-templates.json
```

Keep fixture names aligned with the new public D1 tables, not necessarily the old
Neon table names.

## Public D1 Tables

Use new public read-model tables. Do not modify EasyStarter auth, billing,
credits, or payment tables.

Suggested table prefix:

```txt
public_domains
public_categories
public_domain_tags
public_domain_tag_map
public_brand_ideas
public_logos
public_seo_templates
```

Why prefix:

- avoids collisions with future EasyStarter modules
- makes public-read scope obvious
- makes rollback simple

Minimum fields for each master page should be decided from real fixture data,
not invented from UI assumptions.

## Page Masters

Each page master must define:

- route
- D1 tables
- fields
- loader
- SEO
- UI blocks
- empty state

### Home

Route:

```txt
/
```

Purpose:

- entry page for public domain/brand idea content
- category highlights
- featured domains/ideas
- search or browse entry

Loader:

- featured domains
- featured brand ideas
- top categories

Empty state:

- show category/search entry and do not fail if featured data is empty

### Domains List

Route:

```txt
/domains
```

Purpose:

- searchable/browsable domain list

Loader:

- list domains
- optional category/tag filters
- pagination

Empty state:

- "No domains found" with reset filters

### Domain Detail

Route:

```txt
/domains/:slug
```

Example:

```txt
/domains/brandforge-ai
```

Purpose:

- detail page for a domain/resource

Loader:

- domain by slug
- tags/categories
- related brand ideas
- logo if present

SEO:

- canonical to `/domains/:slug`
- noindex if domain is unpublished or missing required public fields

Empty state:

- 404 for missing slug

### Brand Ideas List

Route:

```txt
/brand-ideas
```

Purpose:

- list generated or curated brand ideas

Loader:

- list brand ideas
- optional domain/category filters
- pagination

Empty state:

- "No brand ideas found"

### Brand Idea Detail

Route:

```txt
/brand-ideas/:slug
```

Example:

```txt
/brand-ideas/cebadi-com
```

Purpose:

- detail page for one brand idea

Loader:

- brand idea by slug
- associated domain
- logos
- related ideas

SEO:

- canonical to `/brand-ideas/:slug`
- noindex if thin or unpublished

Empty state:

- 404 for missing slug

### Category Page

Route:

```txt
/category/:slug
```

Example:

```txt
/category/AI
```

Purpose:

- category browse/SEO page

Loader:

- category by slug or normalized slug
- domains in category
- brand ideas in category
- related tags

SEO:

- canonical should use normalized lowercase slug if possible
- index when public item count is meaningful

Empty state:

- show category shell with no results or 404, depending on whether category
  exists

## Loader Rules

Loaders should read D1 through server-side APIs/loaders only.

Do not:

- expose D1 bindings to browser code
- import server code directly into client-only modules
- depend on Neon at runtime for public pages
- read auth/billing/admin tables for this slice

Do:

- normalize slugs
- return typed empty states
- keep query limits explicit
- include enough SEO fields in loader output
- include related counts if the UI needs them

## Visual Pass Timing

Do not start the visual redesign first.

Sequence:

1. D1 schema and seed.
2. Bare loaders and pages.
3. Real fixture data visible in browser.
4. Field/copy/shape review.
5. Shared page/card components.
6. Visual master with taste/design skill.

Reason:

- real data exposes long names, missing images, bad summaries, and awkward JSON
  before layout polish hides the problem.

## Prompt Use

Prompts are useful, but they should be stage-specific.

Use prompts for:

- Neon export mapping
- D1 schema/seed planning
- page master planning
- visual master design
- component extraction review
- upstream merge risk review

Do not use one giant prompt to do export + schema + seed + UI + visual redesign.

## Stable Prompt: Public Read Model Plan

```text
Plan a public-read migration from Neon to EasyStarter/D1.

Scope:
- public data only
- no auth
- no billing
- no admin
- no provider secrets
- no runtime Neon dependency

Target first fixture:
- 36 domains
- 21 categories
- 36 brand ideas

Target routes:
- /
- /domains
- /domains/brandforge-ai
- /brand-ideas
- /brand-ideas/cebadi-com
- /category/AI

Required output:
1. Source Neon tables and selected columns.
2. JSON fixture shape.
3. D1 public read-model tables.
4. Seed process.
5. Loader contracts for each route.
6. SEO rules for each route.
7. UI blocks and empty states.
8. Files to add.
9. EasyStarter core files touched, if any.
10. Verification command.
11. Privacy/PII review checklist.
```

## Stable Prompt: Component Extraction Review

```text
Review the new public read-model pages for reusable components.

Rules:
- Do not abstract one-off code.
- Promote only repeated UI or stable contracts.
- Prefer EasyStarter/shadcn components.
- Keep site copy and business-specific layout outside shared components.

Output:
1. Components to keep local.
2. Components to promote.
3. Proposed props/contracts.
4. Files to move or create.
5. Risks to EasyStarter upstream merges.
6. One small check after extraction.
```

## Stable Prompt: Visual Master Pass

```text
Create a visual master plan for the public read-model pages after real fixture
data is visible.

Routes:
- /
- /domains
- /domains/:slug
- /brand-ideas
- /brand-ideas/:slug
- /category/:slug

Rules:
- Do not change loader contracts.
- Do not change D1 schema.
- Reuse EasyStarter components where practical.
- Use real fixture data constraints: long names, missing images, empty states.
- Define shared card/list/detail patterns.

Output:
1. Visual system direction.
2. Page-by-page section layout.
3. Shared components.
4. Empty/loading/error states.
5. Mobile behavior.
6. Files likely touched.
```

## Template Extensions Beyond Modules

The template can evolve in more ways than optional modules:

- page masters
- layout conventions
- route naming conventions
- seed/fixture pipeline
- data import scripts
- SEO policies
- card/list/detail protocols
- component extraction rules
- nav extension registry
- server router extension point
- site module config
- customization ledger
- smoke/check scripts
- visual design tokens
- content presets

Optional modules are only one layer.

## Original Template Optimization Ideas

Evaluate these before implementation. Record accepted ones in
`CUSTOMIZATIONS.md`.

| Idea | Pros | Cons | Recommendation |
| --- | --- | --- | --- |
| Add `CUSTOMIZATIONS.md` | Tracks upstream divergence | Another file to maintain | Do now |
| Add `siteModules` config | Clean optional modules | Touches app config/types | Do when first optional module starts |
| Add custom router mount | One stable server touch point | Touches core router once | Do before multiple custom APIs |
| Add nav extension registry | Avoid repeated sidebar edits | Adds small indirection | Do when second custom nav item appears |
| Add public fixture/seed pattern | Faster real-data page work | Need privacy review | Do for public read migration |
| Add web boundary check | Prevents D1/secret leaks | Script maintenance | Do after first code slice |
| Add full RBAC | Stronger admin security | More upstream conflict and scope | Defer |
| Rewrite billing/credits | Full control | High risk, loses EasyStarter value | Avoid |
| Direct Neon runtime reads | Live data | Runtime dependency/secrets/schema coupling | Avoid for first slice |
| Full design system rewrite | Visual consistency | High churn, upstream conflicts | Avoid; compose existing UI |

## First Action Checklist

Before code:

- decide source Neon query/export method
- define fixture schema
- review PII/secret exclusion
- create D1 public table plan
- define route loader contracts
- define minimal UI blocks and empty states
- add accepted template changes to `CUSTOMIZATIONS.md`

Then implement only the first public-read slice.
