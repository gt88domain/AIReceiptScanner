# MySaaS Discovery Module Spec

This document defines the reusable Discovery/Search and SEO Aggregation module
to add on top of EasyStarter.

The module is optional. It must be possible to keep it disabled for plain SaaS
products and enabled for directory, marketplace, gallery, comparison, prompt
library, and resource hub products.

## Fit With EasyStarter

EasyStarter already provides the base SaaS layer:

- auth
- billing
- credits
- storage
- dashboard shell
- landing/blog/docs
- i18n
- web/native/server structure

Discovery should not replace those. Discovery adds a resource graph and public
browse/search pages.

Preferred domain-module layout:

```txt
apps/server/src/modules/discovery/
apps/web/src/modules/discovery/
packages/site-modules/discovery/
```

For the public list-page extraction boundary and phased implementation plan,
see `docs/mysaas-discovery-listing-plan.md`.

Small EasyStarter core touch points:

- register the discovery oRPC router in `apps/server/src/routers/index.ts`
- add TanStack route files for public discovery pages
- add public nav/dashboard nav entries only when enabled
- expose a config toggle

Avoid touching:

- Better Auth
- billing providers
- credits ledger internals
- existing EasyStarter UI primitives
- existing payment/app-config semantics

## Module Toggle

The module should be controlled by config, not by deleting files.

Proposed shape:

```ts
export const siteModules = {
  discovery: {
    enabled: false,
    publicHome: "marketing", // "marketing" | "portal"
    tagIndexThreshold: 5,
    canonicalPagination: "self", // "self" | "first"
  },
} as const;
```

Behavior:

| State | Behavior |
| --- | --- |
| `discovery.enabled=false` | Discovery routes render not found or redirect to the normal marketing site. No discovery URLs in nav or sitemap. |
| `discovery.enabled=true` | Public discovery routes, resource APIs, sitemap entries, and optional admin management are enabled. |
| `publicHome=marketing` | EasyStarter marketing landing remains `/`; portal is a secondary entry if needed. |
| `publicHome=portal` | Discovery Portal Home owns `/`; marketing content moves to configured CMS/landing pages. |

Because TanStack file routes are static, disabled routes may still exist in code.
The runtime loader/component must check config and return not found. The planner
should choose the least invasive pattern after inspecting EasyStarter route
conventions.

## Ontology

Do not conflate these terms.

| Concept | Meaning | Examples | Job |
| --- | --- | --- | --- |
| `type` | Object model, first layer | `tool`, `site`, `movie`, `anime`, `game`, `article`, `prompt`, `resource` | Decides detail structure, card variant, available fields, collection/rank eligibility |
| `category` | User-facing topic entry | payments, CRM, hiring, shonen, romance, RPG | Main navigation and SEO category pages |
| `taxonomy` | Formal configurable dimension | `genre`, `platform`, `region`, `content-format`, `pricing-model` | Shared dimension engine across verticals |
| `tag` | Lightweight semantic label | `open-source`, `beginner-friendly`, `multiplayer`, `no-login` | Long-tail discovery and related-item hints |
| `facet` | Filtering mechanism | price, region, year, platform, rating range, free/open-source | URL-level list filtering and dynamic landing inputs |

Rule:

```txt
category is the entry,
taxonomy is the structure,
tag is supplemental semantics,
facet is the filter mechanism,
type is the object model.
```

## Public Page System

Discovery is not one list page. It is a set of entry pages.

### Portal Home

Route:

```txt
/
```

Only when `discovery.enabled=true` and `publicHome=portal`.

Responsibilities:

- search entry
- category shortcuts
- featured collections
- rank/trending blocks
- recent/featured/sponsor slots
- quick jump
- operational/editorial placements

This is the discovery site's front door, not a normal marketing hero.

### Discover Page

Route:

```txt
/discover
```

The Discover Page is the main discovery engine. It owns URL state.

Supported inputs:

- `q`
- `type`
- `category`
- taxonomy terms
- `tag`
- facet values
- `sort`
- `page`
- `view`

Example:

```txt
/discover?type=tool&category=ai-code&pricing=free&platform=web
```

Do not use `/discover/category/:slug`.

### Category Page

Route:

```txt
/category/:slug
```

Responsibilities:

- user-facing topic hub
- category description and metadata
- items in this category
- links to relevant taxonomy/facet filters
- links to related collections and ranks
- SEO landing content

### Tag Page

Route:

```txt
/tag/:slug
```

Responsibilities:

- long-tail semantic landing
- items with the tag
- related tags and category context

SEO rule:

- tag pages are public for UX
- tag pages with `publishedItemCount <= 5` are `noindex, follow`
- tag pages with `publishedItemCount > 5` may be indexable
- noindex tag pages are excluded from sitemap

### Collection Page

Route:

```txt
/collection/:slug
```

Responsibilities:

- editorial or operational curated set
- use-case pages
- campaign pages
- monetizable/sponsored collections
- stronger SEO copy and conversion slots

Collection types:

- manual curated list
- editorial collection
- seasonal campaign
- topic collection
- system-assisted collection

### Rank / Best Page

Routes:

```txt
/best/:slug
/rank/:slug
```

Responsibilities:

- ordered list
- ranking explanation
- trend or comparison framing
- strong SEO intent
- related category/collection/detail links

SEO rule:

- index only when enough useful items exist
- default threshold: at least 5 items

### Resource Detail Page

Route:

```txt
/:type/:slug
```

Examples:

```txt
/tool/chatgpt
/game/minecraft
/prompt/logo-generator
```

Responsibilities:

- object detail
- category/taxonomy/tag links
- related items
- collection/rank memberships
- source/external links
- save/compare/share/open actions

This route requires reserved path protection.

Reserved type slugs:

```txt
discover
category
tag
collection
rank
best
pages
blog
docs
auth
billing
credits
dashboard
settings
users
admin
app
api
rpc
health
login
register
terms
privacy
```

## Resource Card Protocol

Cards are not decoration. In this template, a card is the standard presentation
layer for a resource object.

The card protocol must be stable even when layouts vary.

Required base fields:

- `id`
- `type`
- `slug`
- `title`
- `summary`
- `image` or `logo`
- `primaryCategory`
- `tags`
- `keyMeta`
- `statusFlags`
- `actions`
- `destination`

Core capabilities:

- clickable primary area
- status badges
- action bar
- 2 to 5 core attributes
- density switch per page
- type-specific field display

Status flags:

- `default`
- `visited`
- `pinned`
- `trending`
- `sponsored`
- `featured`
- `ai-grouped`

Actions:

- open detail
- external link
- save
- compare
- share
- add to collection

Allowed variants:

- `GridCard`
- `CompactListCard`
- `FeaturedCard`
- `RankCard`
- `SponsoredCard`
- `EditorialCard`

Rule: card style may vary, but card payload, status system, and action interface
must stay consistent.

## Quick Jump

Quick Jump is optional.

It is not a replacement for Discover search. It is a fast navigation box.

It may jump to:

- pages
- categories
- tags
- collections
- ranks
- common filter shortcuts
- admin functions
- recently visited items

Implement only after the core Discovery routes exist.

## Data Model Direction

Exact schema belongs in the implementation plan, but the module should plan for
these entities:

- resources/items
- categories
- tags
- taxonomy definitions
- taxonomy terms
- item taxonomy assignments
- collections
- collection items
- rank pages or SEO pages
- sources, optional

Keep tables separate from EasyStarter auth, billing, credits, and payment
tables.

Suggested ownership:

```txt
apps/server/src/modules/discovery/schema.ts
apps/server/src/modules/discovery/router.ts
apps/server/src/modules/discovery/service.ts
apps/server/src/modules/discovery/repository.ts
apps/web/src/modules/discovery/
packages/site-modules/discovery/
```

Do not start with every entity if the first product only needs resources,
categories, tags, collections, and detail pages.

## Search And Facets

Start boring:

- normalized lowercase search columns
- `LIKE` search
- indexed status/category/type fields
- denormalized item counts for category/tag/facet pages
- no external search service

Upgrade path:

1. D1 FTS5 if needed and available.
2. Cloudflare Vectorize for semantic discovery.
3. Postgres/tsvector only for a breakout site that outgrows D1.

Facet counts should be precomputed or denormalized. Do not compute heavy counts
per request.

## SEO Policy

Default matrix:

| Page | Route | Default robots |
| --- | --- | --- |
| Portal Home | `/` | index |
| Discover | `/discover` | index when query/result quality is meaningful; noindex for thin duplicates |
| Category | `/category/:slug` | index when published item count >= 1 |
| Tag | `/tag/:slug` | noindex when published item count <= 5 |
| Collection | `/collection/:slug` | index when published item count >= 1 |
| Best/Rank | `/best/:slug`, `/rank/:slug` | index when item count >= 5 |
| Detail | `/:type/:slug` | index when published |
| Admin/App/API | `/admin/*`, `/app/*`, `/api/*`, `/rpc/*` | noindex |

Canonical rules:

- every indexable page emits canonical
- page 1 strips `page=1`
- discover canonical strips tracking params
- semantic filters may remain in canonical if the preset allows indexable
  filtered pages

Sitemap includes:

- portal home when enabled
- indexable categories
- indexable tags only when count > 5
- indexable collections
- indexable rank/best pages
- published resource detail pages

Sitemap excludes:

- admin/app/api/rpc
- noindex tags
- thin filtered discover URLs
- draft resources

Internal linking minimum:

- Portal links to top categories, collections, ranks, recent items, discover
- Category links to items, related collections/ranks, prefiltered discover
- Tag links to items and category context
- Detail links to category, tags, related items, collections/ranks
- Collection links to items and related categories
- Rank links to ranked items and category context

## Enablement Strategy For Multiple SaaS Products

Discovery can be part of the SaaS template as a disabled optional module.

Examples:

| Product kind | Discovery state |
| --- | --- |
| Simple AI generator | disabled or only collections/examples enabled |
| AI tools directory | enabled |
| Price comparison site | enabled |
| Wallpaper/gallery site | enabled |
| Novel-writing app | disabled first; maybe templates/prompts later |
| Branding generator | disabled first; maybe examples/templates later |

This avoids forking EasyStarter while keeping discovery-heavy sites supported.

## Things The Planner Must Decide

Before implementation, the planning AI must decide:

- first product target
- whether `/` stays marketing or becomes portal
- exact config location for `discovery.enabled`
- route file names after inspecting TanStack route conventions
- first entity set
- first admin path or seed-only path
- whether tags have overview pages or only detail pages
- sitemap generation location
- one small verification command
- upstream merge conflict budget

## Implementation Prompt For Planning AI

Use this prompt to produce the next plan. Do not implement from this prompt
directly; produce a plan first.

```text
You are planning an optional Discovery/Search module on top of EasyStarter.

Read these files first:
- docs/mysaas-extension-brief.md
- docs/mysaas-discovery-module-spec.md
- packages/app-config/src/app-config.ts
- packages/app-config/src/types.ts
- apps/server/src/routers/index.ts
- apps/web/src/routes tree
- apps/web/src/configs/web-config.ts
- apps/web/src/configs/data/sidebar-data.ts

Goal:
Create a long-term reusable Discovery module that can be enabled or disabled per
site without forking EasyStarter core.

Hard constraints:
- Keep EasyStarter close to upstream.
- Put module code under the canonical `modules/<domain>` directories.
- Touch only small registration/config/nav files in EasyStarter core.
- Routes must be top-level: /discover, /category/:slug, /tag/:slug,
  /collection/:slug, /best/:slug or /rank/:slug, and /:type/:slug.
- Do not use /discover/category/:slug.
- Tag pages with publishedItemCount <= 5 are noindex and excluded from sitemap.
- Do not modify auth, billing, credits, or payment providers.
- Do not add full RBAC now.
- Use new discovery-owned tables and migrations.
- Start with boring D1 search: normalized LIKE plus indexes and precomputed
  counts. No external search service in V1.
- Every non-trivial implementation stage needs one small runnable check.

Plan output required:
1. Chosen first slice and why.
2. Module toggle design.
3. Exact EasyStarter core touch points.
4. Files/directories to add.
5. Files to avoid modifying.
6. Initial data model.
7. Route map.
8. SEO/indexing behavior.
9. Card protocol and first card variants.
10. Verification command.
11. Rollback plan.
12. Upstream merge risk estimate.
```

## First Slice Recommendation

Start with the minimum that proves the architecture:

- module config toggle
- resource item table
- category table
- tag table
- resource-category/tag assignments
- public `/discover`
- public `/category/:slug`
- public `/tag/:slug`
- public `/:type/:slug`
- one shared card protocol and two variants: grid and compact list
- tag noindex threshold
- one seed script or fixture
- one smoke/check command

Do collection and rank pages in the second slice unless the first target site is
an SEO directory where those are launch blockers.
