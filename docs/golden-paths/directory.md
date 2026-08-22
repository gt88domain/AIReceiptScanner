# Golden path: directory adapter

Use this path to connect an existing searchable catalog or content directory to
EasyStarter. It is a recipe, not a directory framework: the product retains its
database, URL contract, SEO, taxonomy, cards, filters, and editorial model.

## Presentation primitives and adapter contract

The route-independent components under `apps/web/src/components/listing/`
provide the reusable presentation frame. They do not register routes, fetch
data, define a resource schema, choose canonical URLs, or persist saved items.
Import the component you need from its file; there is no required aggregate
adapter or preview layer.

The product adapter is the route, loader, and state code that connects these
components to one product domain. It owns:

- every visible and accessible label passed through component props;
- validated query and URL state, including search, filters, sort, page, limit,
  and view mode;
- result data, item keys, media, cards, actions, and empty/error copy;
- category, child-category, tag, and select-facet values and their allowlists;
- default sort and ranking rules, plus the meaning of every rank;
- pagination URLs, canonical/noindex policy, and server-side data access; and
- guest sign-in and authenticated persistence for save actions.

The components own rendering and interaction only:

- `ListingShell` arranges an optional desktop rail, mobile `FilterDrawer`,
  header, toolbar, and result content.
- `ListingFacetRail`, `ListingSearchInput`, and `ListingSortSelect` are
  controlled inputs. Their callbacks update product-owned state.
- `ListingToolbar` lays out search, summary, sort, and actions. Its summary is
  a polite status region; the result grid is deliberately not live.
- `ListingGrid` receives items, `getItemKey`, and `renderItem`.
  `ListingMediaCard` receives product-rendered media, title, description,
  badge, footer, and actions.
- `ListingLoadingState`, `ListingEmptyState`, and `ListingErrorState` render
  product-selected states. `ListingLoadMore` is an interaction-only command;
  use `ListingPagination` for crawlable anchor pagination when that component
  is available.
- `ListingSaveButton` is controlled by `saved`; it does not authenticate or
  write a user-resource relation.
- `ListingPage` composes a route-neutral listing frame. `RankingPage` receives
  an already-ranked slice, `rankStart`, `rankLabel`, and a row renderer; it
  never calculates ranking policy.

`PublicDetailLayout` from `apps/web/src/components/public/` provides optional
breadcrumbs, metadata, actions, visual, aside, and related-content slots around
product content. The route still owns resource fields, data loading, SEO, and
action behavior. `Prose` from `apps/web/src/components/content/` styles
already-rendered semantic HTML; compilation, sanitization, embeds, and content
data remain product responsibilities.

All text reaches these primitives through props or children. The shared
components do not read product message catalogs. They consume the semantic skin
tokens from `apps/web/src/styles/index.css`; products may select or override a
skin without branching component logic.

No component in this kit creates `/domains`, `/rankings`, `/favorites`, detail,
or any other default route. Add only the URL families your product owns, and
keep those TanStack route files thin.

## 1. Freeze the public contract first

Before changing runtime code, record the public URL families, dynamic segments,
canonical and redirect rules, sitemap/robots behavior, index/noindex policy,
and every detail-page section that is backed by business data. Identify the
product's public predicate explicitly (for example published, visible, and not
sponsored); never infer it from a generic `isPublic` field.

For an existing database, complete the migration playbook and prove a fresh
database can reproduce the committed migration chain before importing or
backfilling data. Structural migrations, imports, seeds, and repairs remain
separate operations.

## 2. Add one product-owned anonymous read seam

Put the directory repository and query functions in the product server module.
For an anonymous D1 read that needs neither a session nor a product side effect:

1. Reuse the exact query function already used by the product's existing API.
2. Register an explicit product public-read route before generic RPC/API
   context creation.
3. Parse untrusted path and query input at that route boundary.
4. Apply the product's full public predicate inside the shared query.
5. Return the existing DTO and error semantics; do not invent a template DTO.

The route registrar is upstream infrastructure. The routes, DTOs, query input,
and repository are product code. A public read must not construct a full auth,
billing, storage, or jobs context merely to read a catalog.

## 3. Prove parity before moving Web traffic

Start with one list endpoint. Add a focused integration test that calls the
existing API contract and the seam with the same input, then compares their
response bodies. Also prove the seam does not create the full request context.

Expand only to the public reads that the product already has: list, detail,
taxonomy, related content, collections, editorial pages, and sitemap entries as
applicable. Keep writes, click tracking, user favorites, admin actions, imports,
payments, and authenticated reads outside this seam.

## 4. Cut Web over one URL family at a time

Each PR moves one public page family and includes its data parity and SEO
verification. A practical order is:

1. listing/search;
2. highest-value detail page, including real alias-to-canonical redirects and
   related data;
3. taxonomy, tags, and collections;
4. editorial pages and sitemap;
5. browser-only local interactions such as local favorites or recent views.

Do not batch-cut every page. Web routes remain thin, call the product's public
seam, and preserve existing paths, status codes, canonical links, JSON-LD,
robots, sitemap entries, and cache headers. Combined filter URLs should retain
the product's noindex policy rather than creating a new indexable URL space.

## 5. Verify the real deployment without changing data

For a read-only seam change, no migration is applied. Deploy the Server Worker
first, verify the public seam against the existing D1, then deploy the Web
Worker. Capture the deployed Worker version IDs and source commit in the
product's release record.

Use response-level checks for at least one URL in each changed family:

- expected HTTP status and redirect `Location`;
- canonical and robots output;
- sitemap/robots availability;
- a detail response containing its related-content fields; and
- a public-data smoke test with no D1 writes.

If data, URL, SEO, or status behavior differs, stop the cutover and repair the
product adapter. Do not solve it by adding a shared schema, generic explorer,
or migration to the template.

## 6. Keep the product adoptable

Pin normal template adoption to a released tag in `.template/source.json`,
record protected-core deviations as MOD records, and run the existing read-only
`pnpm template:upgrade-check` before each merge. See
[upstream sync](../upstream-sync.md). EasyStarter intentionally does not open
or merge downstream sync PRs automatically.

The directory's taxonomy, editorial workflow, source data, filters, ranking,
SEO copy, cards, detail layout, and commercial behavior remain product
ownership. Consider extracting a UI primitive only after three independent
downstream products prove the same behavior and substantially the same props.
