# Decisions

## D1

Use EasyStarter's D1-first Cloudflare model for the template. Public read-model
data is seeded into D1 from JSON fixtures for the first migration slice.

## Upstream Compatibility

Keep EasyStarter close to upstream. Core changes are allowed but must be small,
intentional, and tracked in `CUSTOMIZATIONS.md`.

## Extension First

New product work starts as an extension module or site-specific code. Promote
only after real reuse appears.

## Public Read First

Migrate public read pages before auth, billing, admin, or private workflows.
Real fixture data should drive schemas and page contracts before visual polish.

## Migration Parity Before Cutover

Every legacy-site migration creates a route-family parity table before coding.
It records the old URL pattern, target outcome, status, redirects, canonical,
robots, sitemap inclusion, counts, and verification evidence. Query-string
filters are noindex by default; fixed canonical category, tag, collection, and
rank pages are evaluated independently for indexing. See
`docs/mysaas-site-migration-playbook.md`.

## Discovery Listing Template

Discovery list pages use protocol + shell + resource adapter. Shared code owns
only layout, generic states, and small stable types; resource adapters own
schemas, queries, facets, cards, pagination, and SEO. Do not build a universal
config-driven list renderer. See `docs/mysaas-discovery-listing-plan.md`.

The default public filter shell uses a category icon grid with parent-triggered
child categories, icon-led native select rows for other single-value facets,
and a collapsed tag cloud. Resource adapters own the taxonomy, values, URL
state, and any resource-specific filter control.

## RBAC

Do not add full RBAC yet. Use the smallest server-side admin gate if early admin
pages need protection.

## Prompts

Reusable prompts live in `TEMPLATE_PROMPTS.md` and selected docs. Every prompt
should remind agents to avoid unnecessary core edits and to update
`CUSTOMIZATIONS.md` when core edits are required.
