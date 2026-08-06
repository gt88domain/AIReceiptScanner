# Phase 0 — UI and Adapter Boundary Audit

No component is extracted in Phase 0. This document separates low-business layout candidates from product presentation.

## Evidence

- AIBranding Domain listing owns search state, static landing redirects and Domain-specific page composition: `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/domains/index.tsx:17-120`.
- AIBranding uses private listing shell/drawer components under `apps/web/src/modules/aibranding/discovery/components/listing/`; Domain detail renders `DomainDetailPage` (`aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/domains/$slug.tsx:55-64`).
- Prompt Dir owns `ResourceDetailPage` and type-specific route behavior (`prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/prompt/$slug.tsx:1-25`; `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/$kind/$slug.tsx:8-53`) plus custom discovery listing code.
- URL Next detail owns website guide/JSON-LD/presentation (`url-next@4e3a90e:apps/web/src/routes/_public/(marketing)/item/$slug.tsx:20-180`).
- Current upstream has slot-based `ListingShell`, filter drawer and grid, but demo route is in-memory and `useState` based: `easystarter-template@a0f24ac:apps/web/src/components/listing/listing-shell.tsx:5-50`; `easystarter-template@a0f24ac:apps/web/src/routes/_public/(marketing)/listing/index.tsx:42-105`.

## Shared Shell Candidate

| Candidate | Evidence | Boundary |
| --- | --- | --- |
| Layout width / main-content slot | upstream `ListingShell` slots; AIBranding private list shell | only generic container and slots; no page ownership |
| Desktop facet-rail slot / mobile drawer | upstream `ListingShell:34-48`; AIBranding private `filter-drawer.tsx` | caller owns controls, state and URL |
| Toolbar / Loading / Error / Empty / Grid-List container | upstream `apps/web/src/components/listing/**` | low business dependency, but extraction waits for adapter API comparison |
| Selected filter chips / pagination shell | both directories have filter/list UX but source APIs differ | Deferred until shared interaction semantics are proven |

## Adapter-only presentation

| Product | Must remain private |
| --- | --- |
| AIBranding | Domain Card/Detail; price and escrow/offer CTAs; extension/prefix/suffix/price/name-length/quick filters; rankings rows; Brand Idea/Logo/Design cards; favorites/inquiry/purchase rail. |
| Prompt Dir | Prompt Card/Detail; copy behavior; platform/use-case/goal/taxonomy controls; resource type cards; collection/ranking pages; static SEO page rendering. |
| URL Next | Website card/detail/sidebar; two-level categories; destination/domain panel; collection content and alias navigation. |

## Deferred / rejected presentation abstractions

- Universal Facet Renderer — rejected from Phase 1; domain money facets and prompt taxonomy differ.
- Presentation Adapter Registry — deferred; no shared component API evidence.
- Universal Detail Skeleton and automatic page generator — rejected; would own product URLs and SEO.
- Foundation Ranking row — rejected; score/identity/CTA differ.

## Visual regression checklist

| Project | paths to baseline | Desktop / mobile / empty / loading / filters / SEO head | risk |
| --- | --- | --- | --- |
| AIBranding | `/domains`, `/domains/:slug`, `/:slug` domain landing, `/category/:slug`, `/rankings/:type` | all required | P0 URL/commerce, P1 visual |
| Prompt Dir | `/prompt/:slug`, `/:kind/:slug`, `/discover`, `/category/:slug`, `/tag/:slug`, `/collection/:slug`, `/ranking/:type` | all required | P0 canonical, P1 indexability |
| URL Next | `/websites`, two-level categories, `/item/:slug`, `/collection/:slug` | reference only | P2 |
