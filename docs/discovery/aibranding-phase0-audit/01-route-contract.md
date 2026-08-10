# AIBranding Phase 0 — Route Contract

## Scope and evidence

This is a read-only downstream Adapter audit, not a route-design proposal.

| Repository | Audited ref |
| --- | --- |
| Foundation (`gt88domain/easystarter-template`) | `80ecfa0f775f7ad4678eaf0d65b5e290ed7007f8` |
| AIBranding (`gt88domain/aibranding-easystarter`) | `d22d0328995f2162c793858f104f12e723e3e4b8` |
| Prompt Dir reference pilot (`gt88domain/prompt-dir-next`) | `6b9f28c1f93c62dc354fff8b450717990992bd03` |

Route files and live, public page reads are the evidence. AIBranding owns every
concrete URL below; Foundation owns no public product route.

## Route matrix

| URL family | Purpose | Class | Owner | Contract notes |
| --- | --- | --- | --- | --- |
| `/` | Brand-builder landing page | Discovery entry | AIBranding | Aggregates several catalogues; canonical `/`. |
| `/domains` | Domain list, filtering and search | Discovery | AIBranding | Query-string search and filters; no standalone product `/search` page. |
| `/domains/:slug` | Domain detail | Discovery with commercial rail | AIBranding | Canonical detail URL; embeds purchase and inquiry actions. |
| `/category` | Domain category navigation | Discovery | AIBranding | Canonical `/category`. |
| `/category/:slug` | Category detail | Discovery | AIBranding | Current route is deliberately `noindex,follow`; do not infer a universal category policy. |
| `/:slug-domains` | Fixed primary/facet domain collections | Discovery / SEO | AIBranding | Examples include `/ai-domains`; the root dynamic route accepts only slugs ending in `-domains`. |
| `/rankings`, `/rankings/:type` | Domain, idea and logo rankings | Discovery | AIBranding | Types are product-defined: `domains`, `brand-ideas`, `logos`. |
| `/brand-ideas`, `/brand-ideas/:slug` | Brand-idea catalogue and detail | Discovery | AIBranding | Product-specific fields and facets. |
| `/templates/logos`, `/templates/logos/:facet/:slug` | Logo catalogue and facet pages | Discovery | AIBranding | No shared Logo DTO is implied. |
| `/templates/design-md`, `/templates/design-md/:slug` | Design MD catalogue and detail | Discovery | AIBranding | Product-specific resource model. |
| `/templates/figma` | Figma template catalogue | Discovery | AIBranding | Product-specific resource model. |
| `/favorites` | Local and account-backed shortlist | Hybrid | AIBranding | Read surface is public-facing; persisted favourites require a user. |
| `/contact` | Contact lead capture | Commercial | AIBranding | Not a Discovery read. |
| Purchase / Make Offer in `/domains/:slug` | Escrow checkout or inquiry submission | Commercial | AIBranding | There is no public `/offer` route; it is a product action within domain detail. |
| `/auth/*`, `/dashboard/*`, `/billing/*`, `/credits/*` | Identity, account, billing and credits | Platform capability consumer | AIBranding | Foundation supplies the capability; AIBranding owns product placement and copy. |
| `/admin/*` | Inventory and inquiry administration | Commercial operations | AIBranding | Never public-read Foundation scope. |
| `/about`, `/blog/*`, `/tools`, legal pages | Marketing/content | Public content | AIBranding | Public, but not Discovery Foundation candidates. |
| `/sitemap.xml`, `/robots.txt` | Crawling contracts | SEO infrastructure + AIBranding data | AIBranding | Preserve existing output and product route inventory. |

## API route contract

AIBranding's catalogue is currently exposed through oRPC under `/rpc/*`, not
through a REST contract such as `GET /api/domains`. Its public procedure names
are `aibranding.home`, `domains`, `domainDetail`, `category`,
`staticDomainList`, `brandIdeas`, `logos`, `designs`, `figmaTemplates`,
`rankings`, and `sitemapEntries`.

The browser-facing web app currently calls those procedures through server
functions and the API service binding. This is an existing product transport
contract, not a Foundation-owned API namespace.

## SEO freeze

The following must remain evidence-backed facts in any later Adapter work:

- `/domains/:slug`, `/category/:slug`, `/rankings/:type`, and
  `/:slug-domains` remain AIBranding-owned URLs.
- Canonicals, robots policies, detail links, redirects, and sitemap entries
  must be tested as product contracts before any route or transport change.
- Foundation must not introduce `/:slug`, `/:type`, or `/:type/:slug` as a
  universal route scheme.

## Phase 0 decision

**PASS for evidence.** The route surface is sufficiently identified to assess
an Adapter. It does not authorize a URL change, shared public route, REST
conversion, canonical rewrite, or runtime migration.
