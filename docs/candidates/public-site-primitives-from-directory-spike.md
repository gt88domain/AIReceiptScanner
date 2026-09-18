# Candidate public-site primitives from the directory spike

## Status

This is an extraction record, not an adoption decision. The implementation that
prompted it lives in the disposable worktree
`codex/directory-layout-spike` based on `f7aa8f8`; it is uncommitted and must
not be merged wholesale. In particular, its replacement landing page is not an
acceptable default product experience.

The goal for a future, focused PR is to take only the stable public-site
contracts below. A downstream product owns routes, data, taxonomy, copy,
branding, SEO policy, and all default page choices.

## Worth carrying forward

### 1. Route-independent directory presentation

The following primitives form a useful, product-neutral kit for a directory,
search result, ranking, or collection page:

- `ListingShell`, `ListingToolbar`, `ListingGrid`, `ListingFacetRail`, and the
  mobile `FilterDrawer`;
- controlled `ListingSearchInput`, `ListingSortSelect`, and
  `ListingSaveButton`;
- `ListingMediaCard` with framed and full-bleed media variants;
- `ListingRank`, `ListingPage`, and `RankingPage` (presentation only);
- `ListingEmptyState`, `ListingErrorState`, and `ListingLoadingState`;
- `ListingLoadMore` for interaction-only continuation.

The kit must create no default `/domains`, `/rankings`, `/favorites`, or detail
route. The adapter supplies labels, query state, URL state, cards, media,
default sort, taxonomy, ranking, and server data. A guest save action begins
sign-in; persistence remains a product-owned authenticated relation.

### 2. Crawlable pagination

Keep `ListingPagination` as a small anchor-based component. The product passes
`hrefForPage`, retains its filters in the URL, and chooses canonical/noindex
policy. It is an alternative to `ListingLoadMore`, not a hidden second
pagination system: public SEO listings should normally use anchor pagination.

### 3. Breadcrumb structured-data helper

Keep `buildBreadcrumbListJsonLd(items)` as a head helper. It returns nothing
for fewer than two items and receives exactly the labels/URLs rendered by the
product's visible breadcrumb. The product route passes the result to its
existing `buildSeoHead({ ldJson })`; the helper must not invent a second visual
breadcrumb component.

### 4. Public detail and reading surfaces

- `PublicDetailLayout`: breadcrumbs, metadata/actions, responsive main/aside
  frame, and related-content slot. It must not own a resource schema or SEO.
- `Prose`: a lightweight, semantic-HTML reading surface for MDX, article,
  answer, and chapter content. It must not own MDX compilation, embeds,
  sanitization, or content data.

### 5. Semantic skin contract

The most useful visual work is the contract, not any one aesthetic:

- semantic Tailwind tokens backed by CSS variables for `surface`, `ink`,
  `line`, `skin-accent`, card/control radii, and raised shadows;
- `--header-height`, `--page-top-gap`, and `--page-top-offset` as layout
  tokens, so public frames do not hard-code header spacing;
- optional CSS-only skin value files such as `saas-neutral`, `catalog-blue`,
  and `dark-entertainment`.

Components must consume semantic tokens only. Raw color values belong in a skin
value file, never in a reusable component. Adding a `--skin-*` token is a minor
compatible change; renaming/removing one is a major change. Do not make a skin
the template's permanent visual identity before a real product adopts it.

### 6. Development-only component gallery

The gallery is valuable as a maintainer tool if kept deliberately non-public:

- route only works under `import.meta.env.DEV` and returns `notFound()` in a
  production build;
- it is listed in Vite's non-public prefixes, has an explicit noindex head,
  and the content-surface check fails if it enters the sitemap;
- the gallery module is lazy-loaded, so production users do not download it;
- it demonstrates the three skins, theme switching, controls, cards, facets,
  rankings, states, and prose in one place.

Gallery copy is developer documentation, not product copy. It is not a public
marketing page and must never become one.

### 7. Development-port escape hatch

Make the TanStack Devtools event-bus port configurable through
`TANSTACK_DEVTOOLS_BUS_PORT`, retaining `42069` as default. This prevents an
unrelated local Vite project from making a worktree's dev server crash with
`EADDRINUSE`.

## Do not carry forward from the spike

- The generic replacement landing page and its “template foundation” copy.
  It made the public site less distinctive and should not replace the existing
  landing design without a separately approved visual direction.
- A default public Header/Footer redesign. Their navigation is product IA; only
  the semantic-token compatibility work is a candidate.
- Demo items, sample taxonomy, route names, faux ranking data, product claims,
  placeholder brand copy, or media.
- A default public listing/ranking/detail URL family.
- Any assumption that a local Web-only worker preview verifies authenticated
  dashboard routes.

## Adoption order and acceptance

1. Take SEO navigation (`ListingPagination` and breadcrumb JSON-LD) in one
   narrow PR with unit coverage where practical.
2. Take the directory/detail/prose primitives plus the written adapter contract
   in a second PR. Do not alter existing landing pages.
3. Add semantic skins only after reviewing their interaction with the existing
   light/dark theme and dashboard tokens.
4. Add the dev-only gallery last, with the production-leak checks in the same
   PR.

For every UI PR run formatting, types, lint, production build, and the content
surface gate. Browser acceptance must run Web and API together on a matched
pair of local origins (for example `localhost:3000` and `localhost:3001`),
with local D1 initialized. A Web-only Worker preview is sufficient for public
static pages and the development gallery, but it will return `503 Service
Unavailable` for authenticated dashboard routes because no API service is
bound.
