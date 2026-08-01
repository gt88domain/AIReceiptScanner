# MySaaS Discovery Listing Plan

## Decision

Use a **protocol + shell + resource adapter** design for public Discovery list
pages.

This is not a universal page generator. A shared listing layer owns only the
stable page structure and its correctness rules. Each resource owns its card,
filter semantics, D1 query, SEO content, and page-specific actions.

This decision is based on two real list products:

- `domains-tanstack`: structured domains, brand ideas, logos, and design
  templates with static SEO redirects and limit-based load more.
- `dir-template/prompt-dir`: prompt discovery with multi-select taxonomy
  filters, typed cards, sponsored insertions, and API-based load more.

Prompt Directory can migrate to this template. Its multidimensional filters are
a resource adapter, not a reason to make the shared shell understand every
taxonomy or card type.

## Non-Goals

- Do not build a config-driven universal list page.
- Do not move D1 or data access into browser code.
- Do not share D1 queries, cards, sponsor rules, or SEO copy between resources.
- Do not create `packages/site-modules/discovery` until a server and web
  consumer genuinely need the same runtime-neutral contract.
- Do not modify EasyStarter runtime code during this planning stage.

## Ownership Boundary

```txt
shared listing layer
  owns: frame, mobile filter presentation, toolbar layout, standard facet rail,
        load-more command, grid shell, loading/empty/error states, stable
        protocol types

resource adapter
  owns: route search schema, defaults, query normalization, D1 loader,
        facet controls, card variants, pagination strategy, SEO policy,
        static landing redirects, editorial blocks
```

The important rule is that a card is rendered by the resource, not by the
listing layer:

```tsx
<ListingFrame header={<PromptHeader />} filters={<PromptFacetRail />} toolbar={<PromptToolbar />}>
  <PromptGrid items={data.items} />
</ListingFrame>
```

`/category/:slug`, `/tag/:slug`, collection, and rank pages use the same frame
with fewer slots. A simplified page is not a different template.

## Minimal Protocol

The first shared types should stay intentionally small:

```ts
type ListingQueryCore = {
  q?: string;
  sort?: string;
  page?: number;
  limit?: number;
  view?: "grid" | "list";
};

type ListingResult<TItem> = {
  items: TItem[];
  total?: number;
};

type FacetOption = {
  value: string; // Stable slug/value used in URLs and D1 queries.
  label: string; // Human-facing text only.
  count?: number;
};
```

The protocol deliberately does not define a universal `facets` shape or a
universal pagination object. Domains can use a price range and static redirects;
prompts can use multi-select platform/safety/use-case filters; a gallery can use
cursor pagination. Those remain adapter concerns.

## Planned File Layout

### Shared Web Listing Layer

The shared layer adds eleven files under one custom module directory. It adds a
twelfth only after two resources prove that they share the same query helper:

```txt
apps/web/src/modules/discovery/listing/
  listing-types.ts             # protocol types only
  listing-frame.tsx            # header, optional desktop filters, mobile drawer, results slots
  listing-toolbar.tsx          # optional search/count/sort layout slots
  listing-search-input.tsx     # controlled search UI; adapter owns route updates
  listing-sort-select.tsx      # validated sort options supplied by adapter
  listing-grid.tsx             # stable grid density plus renderItem
  listing-facet-rail.tsx       # category grid, child categories, selects, tag cloud
  listing-load-more.tsx        # resource-controlled incremental-load command
  listing-empty-state.tsx      # neutral empty state
  listing-error-state.tsx      # neutral error state with optional retry
  listing-loading-state.tsx    # grid-aligned loading state
  listing-query.ts             # pure default/reset-page helpers, only if repeated in two resources
```

`listing-query.ts` is optional. Do not add it until the second resource repeats
the same route-search transformation.

### First Resource Adapter

When a real site migrates, add its code next to the shared layer rather than
inside EasyStarter components:

```txt
apps/web/src/modules/discovery/resources/prompts/
  search.ts                    # Zod route schema, defaults, normalization
  loader.ts                    # calls typed server API or server function
  facets.tsx                   # Prompt Directory platform/safety/use-case UI
  card.tsx                     # prompt-specific grid/list card variants
  seo.ts                       # canonical, noindex, static route decisions

apps/web/src/routes/_public/(marketing)/discover.tsx
                              # thin TanStack route wiring only
```

The same shape works for domains:

```txt
apps/web/src/modules/discovery/resources/domains/
  search.ts
  loader.ts
  facets.tsx
  card.tsx
  seo.ts
```

Server files are added only when the product's public read model reaches D1:

```txt
apps/server/src/modules/discovery/
  repository.ts                # parameterized D1 reads and indexes' query shapes
  service.ts                   # resource-neutral orchestration only when actually shared
  router.ts                    # public oRPC procedures, if the web requires them
  schema.ts                    # module-owned tables/types, if not already owned by public-read
```

Do not create every listed server file by default. A first resource may only
need a repository and one router.

## Configuration Plan

Configuration has two levels.

### Module Configuration: Required Before Enabling Discovery

Add a small, non-secret `siteModules.discovery` setting to EasyStarter's common
app config only when the first Discovery route is implemented:

```ts
siteModules: {
  discovery: {
    enabled: false,
    publicHome: "marketing",
    tagIndexThreshold: 5,
    defaultPageSize: 24,
  },
}
```

Likely core files, to be confirmed against the upstream version at that time:

```txt
packages/app-config/src/types.ts
packages/app-config/src/app-config.ts
apps/web/src/configs/web-config.ts
```

This is a medium-risk, one-time core customization. It must be recorded in
`CUSTOMIZATIONS.md` and tested by the existing workspace typecheck.

### Resource Configuration: Optional and Local

Each resource may have a local constant for values that are genuinely stable:

```ts
export const promptListingConfig = {
  resultLabel: "prompts",
  defaultSort: "newest",
  pageSize: 24,
  filteredRobots: "noindex,follow",
} as const;
```

Do not use config for JSX, SQL, card variants, hierarchy behavior, sponsored
placement, or arbitrary filter logic. Keep those in the resource adapter, where
they are type-checked and reviewable.

## Route and State Rules

- Every route validates URL input with its own Zod schema.
- Normalize defaults in the route adapter and strip default search parameters.
- Changing a filter, query, sort, or view resets the resource's page/cursor.
- URLs store `FacetOption.value`, never a display label.
- D1 loaders independently validate inputs; they never trust browser state.
- Category/tag/collection/rank pages are dedicated SEO entries, not query URL
  aliases of `/discover`.
- Tag pages with `publishedItemCount <= 5` are `noindex,follow` and excluded
  from the sitemap.

## Performance and Stability Rules

- Render the first result page on the server; do not fetch an unbounded list.
- Start with a fixed maximum page size and indexed D1 filters.
- Load result rows and reusable facet summaries in parallel only when both are
  needed. Do not calculate expensive global facet counts on every request.
- Use parameterized D1 queries and an allowlist for sort keys.
- Keep client state limited to transient input text and drawer state. The URL is
  the source of truth for filters.
- Keep pagination as a resource slot: numbered pages, limit-based load more,
  and cursor pagination are all valid.
- Each new non-trivial search normalization/helper leaves one small runnable
  check. The preferred first check is a pure test for defaults, page reset, and
  invalid sort rejection.

## Phased Implementation

### Phase 0: This Plan

- Add this document and concise references in the existing handoff documents.
- No runtime code or core files change.

### Phase 1: Shared Listing Shell

- Add `listing-types`, `listing-frame`, `listing-toolbar`, controlled search
  and sort controls, `listing-grid`, and three focused state components.
- Port the neutral parts of `domains-tanstack` first.
- Remove domain-specific labels from shared components.
- No D1 schema, router, or global config is required yet.

Status: implemented on 2026-07-12. The shared layer has no public route or
resource adapter until a real product migration starts.

### Phase 1.1: Standard Public Filter Rail

Implemented on 2026-07-13 from the proven AI Branding public-list layout.
`ListingFacetRail` is the default filter shell for future directory resources:

- categories are icon buttons, not a generic select;
- selecting a category reveals only its child category buttons;
- other single-value facets are icon-led full-row native selects;
- tags are a collapsed multi-select cloud;
- `ListingLoadMore` is the default incremental-load command.

`ListingFrame.header` renders in the results column, so a resource can use it
for the right-side hero/search area while the filter rail remains on the left.

The shell has no sample cards, resource taxonomy, card markup, URL parsing, or
D1 access. A resource adapter keeps all of those concerns local. This is a
standard layout contract, not a universal config-driven renderer.

### Phase 2: First Real Resource

- Select either domains or prompts based on the next migration.
- Add its resource adapter, D1 public-read queries, and thin TanStack routes.
- Add `siteModules.discovery` and one runtime disabled-module check.
- Record all core changes in `CUSTOMIZATIONS.md`.

### Phase 3: Prompt Directory Migration

- Migrate the Prompt Directory's `platform`, `safety`, and `use_case` filters
  as prompt-owned multi-select facets.
- Keep Prompt Directory's typed cards, sponsored insertion, and prompt actions
  outside the shared listing layer.
- Adopt its useful behavior: URL-backed multiselect values, reset-on-filter
  navigation, active-filter display, and resilient load-more error handling.

### Phase 4: Promote Only Proven Utilities

- Extract `listing-query.ts` only after two adapters share the exact behavior.
- Create `packages/site-modules/discovery` only when the server and web need a
  stable shared contract that cannot remain in the custom module.

## Core Touch Points and Upstream Risk

| File area                               | When touched                  | Risk   | Control                       |
| --------------------------------------- | ----------------------------- | ------ | ----------------------------- |
| `packages/app-config/src/types.ts`      | Discovery toggle              | medium | one small typed config shape  |
| `packages/app-config/src/app-config.ts` | disabled default              | medium | one documented default        |
| `apps/web/src/configs/web-config.ts`    | expose safe web config        | medium | no secrets, no business logic |
| `apps/web/src/routes/*`                 | first public routes           | medium | route files stay thin         |
| `apps/server/src/modules/index.ts`      | only if public oRPC is needed | low    | one module router registration |
| auth/billing/credits/providers          | never for this work           | high   | do not touch                  |

Every actual core edit needs one dated `CUSTOMIZATIONS.md` entry with files,
reason, merge risk, rollback, and verification command.

## Required Reading for AI Work

Every MySaaS implementation agent reads:

```txt
CUSTOMIZATIONS.md
ARCHITECTURE.md
MODULES.md
DECISIONS.md
docs/mysaas-ai-handoff-rules.md
```

An agent changing a Discovery list additionally reads:

```txt
docs/mysaas-discovery-module-spec.md
docs/mysaas-discovery-listing-plan.md
DATA_FLOW.md                 # when D1, fixture, or public-read code changes
```

It then reads the relevant resource adapter before editing it. This is enough
context without forcing unrelated product work to read the full Discovery spec.

## Handoff Prompt

```text
You are changing an EasyStarter/MySaaS Discovery listing.

Read first:
- CUSTOMIZATIONS.md
- ARCHITECTURE.md
- MODULES.md
- DECISIONS.md
- docs/mysaas-ai-handoff-rules.md
- docs/mysaas-discovery-module-spec.md
- docs/mysaas-discovery-listing-plan.md
- DATA_FLOW.md when changing D1, fixtures, or public-read code

Use protocol + shell + resource adapter. Do not build a universal list page.

Shared listing code may own only frame/layout, generic state presentation, and
small stable protocol types. Resource code owns route Zod schemas, D1 queries,
facet semantics, cards, pagination, SEO, and editorial blocks.

Keep new files under apps/web/src/modules/discovery or
apps/server/src/modules/discovery. Do not add a package or core edit unless a
real repeated need requires it. If you modify EasyStarter core, update
CUSTOMIZATIONS.md before finishing.

Before coding, state the resource, files to add, core files to touch, and one
verification command. After coding, report the same information and remaining
risks.
```
