# Discovery Custom Module

This directory owns MySaaS Discovery UI that is intentionally separate from
EasyStarter core.

`listing/` contains the shared listing frame, the standard public filter rail,
controlled search/sort controls, load-more command, grid, states, and small
protocol types. The filter rail follows the AI Branding public-list pattern:

- icon category grid
- child categories after their parent is active
- icon-led, full-row native select filters
- collapsed tag cloud

It does not own resource data, cards, route state, or presentation. A resource
adapter provides category/facet values and callbacks, renders its own cards,
and keeps loader, pagination, and SEO under `resources/<resource>/` when that
resource migrates.

## First Resource Composition

The route owns its header and result renderer; the shared layer only arranges
them. A resource adapter wires validated URL state into the controls:

```tsx
<ListingFrame
  header={<ResourceHero />}
  filters={<ListingFacetRail category={category} selectFacets={selectFacets} tags={tags} />}
  toolbar={
    <ListingToolbar search={<ResourceSearch />} summary={resultSummary} sort={<ResourceSort />} />
  }
>
  <ResourceCards items={result.items} />
  <ListingLoadMore hasMore={result.hasMore} isLoading={isLoadingMore} onClick={loadMore} />
</ListingFrame>
```

`ResourceHero`, `ResourceCards`, URL parsing, facets, and `loadMore` remain
resource-owned. The shared module never supplies example resources or card
data.

Read `docs/mysaas-discovery-listing-plan.md` before changing this module.
