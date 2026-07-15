# MySaaS Site Migration Playbook

Use this playbook when moving an existing product site into the EasyStarter
template. It is the common process for domains, directories, prompt libraries,
AI tools, and content sites. Use the public-read migration document for the
Neon-to-D1 details after this playbook classifies the work.

## Goal

Preserve public URLs, real data, visible behavior, and SEO value while replacing
the old runtime with TanStack Start, EasyStarter, and D1. Do not make a visual
rewrite that silently drops routes, metadata, or content states.

## 1. Classify The Site Before Coding

Choose the smallest migration slice that can ship independently.

| Site shape | First slice | Defer |
| --- | --- | --- |
| Public directory or content site | public read pages and SEO routes | auth, billing, admin, writes |
| AI generator | one public/anonymous product flow, if one exists | jobs, credits, model settings |
| Authenticated SaaS | a read-only public marketing/content slice | account migration and billing |
| Hybrid site | public directory/content first | private dashboard and operations |

Start with public read data unless a real product cannot work without a private
workflow. This keeps the first cut free of account, money, and provider risk.

## 2. Build A Migration Packet

Before implementation, create a short site-specific record under
`docs/migrations/<site>/`. Do not create this directory until a real site is
selected.

Required files:

```txt
inventory.md       # source stack, data source, public/private boundary
route-map.md       # every old public URL and its target behavior
data-contract.md   # tables, fields, joins, fixture safety, D1 ownership
page-contracts.md  # one contract per page master
visual-baseline.md # screenshot URLs, viewport sizes, interaction states
cutover.md         # redirects, canonical host, sitemap, analytics checks
parity.csv          # machine-auditable legacy-to-target route evidence
```

The route map records exact legacy paths. Never replace `/category/:slug` with
`/discover/category/:slug` merely because the new internal structure differs.

`parity.csv` is the release gate, not project paperwork. One row per route
family is sufficient; do not hand-maintain one row for every detail slug. It
must record at least:

```txt
legacy pattern,target pattern,route class,expected status,redirect status,
canonical policy,robots policy,sitemap inclusion,source count,target count,
metadata check,visual check,owner,decision
```

Route classes are: static SEO page, list/filter page, category/tag page,
collection/rank page, detail page, redirect, retired page, and private/defer.
The parity check expands representative slugs for each dynamic family and
verifies every legacy URL has exactly one deliberate outcome: serve, redirect,
return 404/410, or remain private. Do not leave a legacy path ambiguous.

## 3. Inventory Before Porting

For every public page, capture:

- canonical URL and any legacy aliases
- index/noindex status, title, description, canonical, robots, and JSON-LD
- page type: home, list, category, tag, collection, rank, detail, article, or
  legal
- fields shown above the fold and all visible empty/loading/error states
- data source tables, joins, images, and public safety classification
- filters, URL parameters, sort order, pagination/load-more behavior
- screenshot at desktop and mobile widths before replacing the old page

Mark each old route as one of: preserve, redirect, merge, intentionally remove,
or private/defer. "Not yet implemented" is not a valid final classification.

Also export the old `robots.txt`, sitemap(s), HTTP status, final URL after
redirects, title, description, canonical, robots, and structured-data presence
before changing DNS or replacing the app. Store the export timestamp and source
host in `inventory.md`; source behavior changes while migration work is in
progress.

## 4. Freeze A Page Contract

Each page master gets a concise contract before its UI is rebuilt:

```txt
Route and aliases
Public D1 tables and fields
Validated loader input and result shape
SEO policy and structured data
UI blocks and responsive states
Empty, loading, and error behavior
Internal links and related-content rules
Acceptance screenshots and parity checks
```

Use a real fixture to expose missing fields and overlong copy before copying the
old visual design. No card or filter abstraction should be introduced only to
make the contract look generic.

## 5. Use The Standard Data Path

For public data, use the migration path below:

```txt
old database/CMS
  -> reviewed JSON fixture
  -> module-owned D1 seed
  -> server loader or public API
  -> TanStack route
  -> page adapter and UI
```

Rules:

- browser code never reads D1 or server secrets
- fixtures exclude emails, IDs tied to users, payment data, IPs, and private
  notes
- D1 table names and migrations belong to the custom module, not auth/billing
- fixture import is idempotent before any recurring sync is added
- direct Neon runtime reads are a temporary diagnostic tool, not the target
  architecture
- loaders query by canonical slug, taxonomy term, or validated facet and always
  apply a bounded `limit`; never fetch a catalog into Worker memory and filter
  it in JavaScript
- use the old public ID only as an import key when needed; preserve the old
  public slug as the URL identity rather than regenerating it from a title
- validate fixture row counts, unique public identities, parent/child
  references, and required visible fields before seeding D1
- large D1 imports must be idempotent and split below D1 statement-size limits;
  the committed seed command must work without a one-off local workaround
- imported historical HTML is untrusted input: render it as text or sanitize it
  at a documented server boundary

See `docs/mysaas-public-read-model-migration.md` for the fixture, seed, and D1
detail.

## 6. Keep The New Code Isolated

Start site-specific. Promote only proven common behavior.

```txt
apps/server/src/custom/<site-or-module>/
apps/web/src/custom/<site-or-module>/
apps/web/src/routes/                  # thin TanStack route wiring only
```

For directory lists, use the existing Discovery boundary:

```txt
custom/discovery/listing/              # shared page shell only
custom/discovery/resources/<resource>/ # route schema, loader, facets, cards, SEO
```

The shared listing layer never owns resource cards, taxonomy, query semantics,
pagination strategy, sponsorship, or editorial copy.

## 7. Migrate In This Order

1. Capture the migration packet and old-page screenshots.
2. Export a small, representative public fixture.
3. Add module-owned D1 schema/seed and server read path.
4. Implement the target route with real data and all non-visual states.
5. Rebuild the public layout, filters, cards, and interactions against the
   screenshots.
6. Add canonical, robots, alternates, JSON-LD, sitemap, and internal links.
7. Compare URL, content, visual, and interaction parity at desktop and mobile.
8. Add redirects and switch the canonical host only after the replacement is
   crawlable and observable.

Do not move to the next page master while the previous one has unknown data,
route, or SEO gaps.

Keep source extraction separate from product code. An export may read a legacy
database or public API; the deployed application must not require that source
once the D1 read model is seeded. Record the source snapshot time, row count,
and any deliberate exclusions in `data-contract.md`.

## 8. SEO And Visual Parity Gates

Public routes are complete only when all statements are true:

- the old canonical path resolves or has a deliberate permanent redirect
- title, description, canonical, robots, alternate locales, and JSON-LD are
  present where the old page had them
- indexable pages enter the generated sitemap; non-indexable pages do not
- list filters are URL-backed and reset incremental pagination correctly
- tag pages with five or fewer published items use `noindex,follow`
- parameterized search, sort, pagination, and facet combinations use
  `noindex,follow` unless a specific stable combination has its own canonical
  landing route and editorial/data quality sufficient for indexing
- a fixed category, tag, collection, or rank URL is indexable only when it has
  a stable canonical path, enough public results, unique metadata, and a
  deliberate internal-link path; accessibility alone never makes a URL
  indexable
- redirects use `301`/`308` only for durable replacements; use `302`/`307` for
  temporary routing and do not redirect unrelated removed pages to a generic
  home page
- the first result page is bounded and server-rendered
- desktop and mobile screenshots preserve hierarchy, spacing, filters, and
  page-specific interactions rather than only copying colors
- empty, loading, and error states are intentional and reachable

EasyStarter already supplies `buildSeoHead`, localized alternate links,
Fumadocs, blog MDX loaders, and sitemap generation. Reuse those before adding
another SEO framework or CMS.

## 9. Core Changes And Upstream Sync

The preferred migration uses no EasyStarter core edits. When one is unavoidable,
limit it to a predictable seam:

- one web route file
- one custom server router mount
- one navigation/config extension point
- one seed or verification script

Record every core edit in `CUSTOMIZATIONS.md` with the reason, merge risk,
rollback, and verification. Never spread special cases across auth, billing,
credits, providers, or common UI primitives.

## 10. Promote Back Into The Template Carefully

After each site migration, review what can become reusable:

- promote a component or helper only after two real sites need the same stable
  contract
- keep site copy, card variants, taxonomy, SQL, and SEO wording local
- document newly promoted behavior and its owner
- leave the original site adapter intact until the second site proves parity

The goal is a growing template, not a universal renderer with every old site's
assumptions embedded in it.

## 11. Release In Independent, Reversible Slices

Do not combine unrelated migration concerns in one commit or deployment. Use
the smallest practical sequence:

1. inventory, parity table, and source export evidence
2. D1 schema, seed, and integrity check
3. read-only server loader/API
4. one page master and its visual/interaction parity
5. canonical/robots/sitemap/redirect behavior
6. private features such as auth, billing, admin, and writes

Each slice gets its own commit and preview deployment. Before promotion, audit
representative URLs from every route family for HTTP status, final URL,
canonical, robots, title/description, and rendered content. Compare desktop
and mobile screenshots for public page masters. Keep an explicit rollback:
previous deployment/version, reversible redirect list, seed re-run command,
and cache purge scope.

Do not point a production host at a replacement until the preview passes the
parity rows assigned to that slice. After cutover, monitor 404s, redirect
volume, crawl errors, response latency, and D1 query failures; a successful
build does not prove a successful migration.

## Handoff Checklist

Before giving a migration to another AI, provide:

1. migration packet path and target page master
2. exact old URLs and target routes
3. fixture tables and public/private exclusions
4. screenshot references and required interactions
5. allowed core touch points, if any
6. required SEO behavior and verification commands

The agent must read `CUSTOMIZATIONS.md`, this playbook, the relevant resource
specification, and `DATA_FLOW.md` before changing D1 or public-read code.
