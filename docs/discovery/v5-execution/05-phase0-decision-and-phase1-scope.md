# Phase 0 — Decisions and Phase 1 Scope

## A. Decided from source evidence

1. Foundation does not own public product URLs or route files. Root dynamic routes already exist in AIBranding and Prompt Dir; see [route audit](./01-route-and-seo-audit.md).
2. First rebuild freezes current product canonicals, aliases and sitemap behavior. `/prompts/:slug` is not an approved Prompt canonical.
3. Foundation does not create shared Schema or Migration. AIBranding has commercial Domain tables; Prompt has raw snapshot plus normalized discovery projection; their shapes are not proven equivalent.
4. Lightweight public reads are a real common problem: Prompt implements a direct Hono D1 route while AIBranding's public procedures create a full Auth/Payments/Credits/Storage Context.
5. Card, Detail, filters, Rankings, collections, import, admin, user interaction and commercial workflows remain downstream-owned.
6. `url-next` is route/alias/two-level-category reference only; it has no power to promote a Foundation capability.

## B. Decisions still required

| Decision | extra evidence | owner | latest phase | wrong-decision cost |
| --- | --- | --- | --- | --- |
| Prompt canonical inventory, build sitemap, link callers and redirect graph | closed by [Phase 0.1 evidence](./06-prompt-canonical-and-sitemap-closure.md) | Prompt Dir owner | Gate A Freeze acceptance | P0 duplicate index or lost ranking |
| Search Console, indexed URLs, backlinks and organic landing pages | required only before a future URL/canonical migration | Prompt Dir owner | future URL migration gate | P0 migration traffic loss |
| Whether public reads share one transport | measure AIBranding public RPC Context cost; compare Prompt Hono cache/error behavior | Foundation + both product owners | Phase 3 | P1 forced API migration |
| Pagination helper extraction | AIBranding page behavior and Prompt corrected non-cumulative baseline | both Adapter owners | Phase 3 | P2 incompatible pagination |
| Any shared Schema | two Adapter field/lifecycle/uniqueness proof plus migration/shadow-read/cutover/rollback ADR | product data owners | Phase 5 | P0 data/commercial loss |
| Cache invalidation interface | product cache headers and credentials, rate-limited purge test design | product operators | after real cache implementation | P2 stale/overpurge |

## C. Rejected in current scope

- Universal Discovery Item / universal CMS / universal Schema.
- Universal Card, Detail skeleton, page generator or Facet Renderer.
- Foundation root `/:slug`, `/:type`, `/:type/:slug`, or root SEO Page.
- Foundation Ranking algorithm/table/job, Collection table, Alias table, Import CMS, Admin CRUD, FTS5 or Vectorize.
- “Migrate tables first”; “change canonical first”; production migration before private adapters.

## D. Gate A — Governance/Test-only

**Conditional Go.** Phase 0.1 closes the source/build evidence. Once the product owner accepts the frozen URL inventory, a separate, narrow governance/test PR may start with RED tests.

The following are the only eligible candidates, each beginning with RED contract tests:

| Item | double-downstream need | Phase 1 form | runtime / core / governance | non-goal |
| --- | --- | --- | --- | --- |
| Public-read registration extension-point proposal | AIBranding pays full Context; Prompt demonstrates direct public read | RED contract tests plus design ADR; implementation only after review | touches server app registration; separate governance PR | no endpoint, DTO, route or Schema |
| Public-read dependency allow-list test | both expose anonymous catalogue reads | RED test that rejects Auth/Payments/Credits setup | may be test-only initially | no replacement of AIBranding/Prompt transport |
| Route reserved-segment / ownership test helper | both contain conflicting dynamic and static URL families | RED fixture-based helper | web/test utility; no product routes | no new namespace or canonical |
| Canonical/robots/sitemap parity test helper | both rely on SEO metadata; policies differ | product-supplied expected outputs | test-only | no shared SEO content/rules |

No shared List/Detail DTO or pagination helper is approved for runtime extraction yet: current list/detail and paging evidence is materially different. Existing upstream Listing components can receive only a small backward-compatible change if a RED test proves a slot-level need; no route or CSS rewrite.

## E. Gate B — Runtime/Data/URL

**No-Go.** The following remain prohibited regardless of Gate A:

Shared Schema; any Migration; new public Web route; URL/canonical change; Ranking; Collection; Taxonomy engine; Import; Admin CRUD; Alias table; FTS5; Vectorize; Cloudflare resources; product migration; any downstream repository modification.

## F. Gate decision

- **Gate A — Governance/Test-only:** Conditional Go after the URL Freeze is accepted. Source route evidence, build output, internal detail-link callers and redirect graph are closed; Search Console is not a prerequisite for a test-only PR.
- **Gate B — Runtime/Data/URL:** No-Go. Public-read runtime extension points, new APIs, shared DTOs, Schema, Migrations, Adapters, canonical or URL changes, product migration and Cloudflare staging remain prohibited.

Search Console, indexed-page counts, backlinks, organic landing pages, a 301 map and post-release crawl monitoring are required only before a future URL/canonical migration—not before Gate A's pure test/ADR work.

## Risks

| Severity / class | Evidence and impact | current control | recommended control | blocks Phase 1? |
| --- | --- | --- | --- | --- |
| P0 URL/Router | AIBranding and Prompt both own root dynamic routes | documents mark Freeze | inventory fixture and collision tests | Yes for public routing |
| P0 SEO | Prompt has multiple detail/legacy paths; AIBranding has domain landing 308 | no URL changes in Phase 0 | canonical/sitemap/link parity before any migration | Yes for URL change |
| P0 Commercial/Data | AIBranding Domain price, escrow, offers/inquiries and views use legacy identities | no schema/migration | protected data asset audit + future shadow-read plan | Yes for Schema/production |
| P1 Auth/Permission | AIBranding public reads use full Context; a naïve bypass could expose protected operations | no runtime change | explicit public dependency allow-list tests | No for ADR/tests; yes for runtime |
| P1 Upgrade | old downstreams differ from v0.4.10 | isolated worktrees | separate product migration audit | No |
| P1 UI Regression | product cards/facets are not shared | no extraction | visual baseline before reuse | No for test-only work |
| P2 Performance | Prompt cumulative pagination reads prior pages | no behavior change | product-local fix/benchmark before common helper | No |
| P2 Operational rollback | cache purge interface not implemented | TTL/headers remain product-owned | rate-limited tagged purge design after product cache evidence | No |
