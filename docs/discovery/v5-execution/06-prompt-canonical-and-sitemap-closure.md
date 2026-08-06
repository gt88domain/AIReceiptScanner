# Phase 0.1 — Prompt Canonical / Sitemap Evidence Closure

审计日期：2026-08-06。此文件完成 Phase 0 的 Prompt SEO 证据闭合；不是 Phase 1，也不授权 Runtime、路由、Schema、Migration、Adapter、Cloudflare 或下游修改。

## 1. Fixed baseline and method

| Repository | Commit | Worktree / state | Method |
| --- | --- | --- | --- |
| easystarter-template | `b0eb66667f2b730fb036183571b818fa0362ab6e` | PR #51 documentation branch | write documentation only |
| prompt-dir-next | `56a9eedbe8a4f494df6033e7fdf4ef1fdc2f2045` | detached, clean, read-only | `pnpm install --frozen-lockfile`, then `pnpm build` |

The Prompt audit worktree contains no actual `.env*` file; only example files were present. No Wrangler, deploy, D1, migration, R2, Queue or remote command was run. Build products remain ignored (`prompt-dir-next@56a9eed:apps/web/.gitignore:2,18`).

## 2. Actual sitemap output

The built file `prompt-dir-next@56a9eed:apps/web/dist/client/sitemap.xml` contains exactly 12 `<loc>` entries: `/`, `/privacy`, `/terms`, `/docs`, and those same four paths beneath `/zh` and `/jp`. The static source list is the same twelve paths at `prompt-dir-next@56a9eed:apps/web/vite.config.ts:12-34`; the sitemap plugin is enabled at `prompt-dir-next@56a9eed:apps/web/vite.config.ts:119-137`.

| Page type | Generated count | URL pattern in output | Duplicate | Unpublished content |
| --- | ---: | --- | --- | --- |
| Prompt Detail | 0 | `/prompt/:slug` | no entries | not applicable: no D1 resource was emitted |
| Typed Resource | 0 | `/:kind/:slug` | no entries | not applicable: no D1 resource was emitted |
| Category | 0 | `/category/:slug` | no entries | not applicable: no D1 category was emitted |
| Tag | 0 | `/tag/:slug` | no entries | not applicable: no D1 tag was emitted |
| Collection | 0 | `/collection/:slug` | no entries | not applicable: no D1 collection was emitted |
| Static SEO Page | 0 | `/:slug` | no entries | not applicable: no D1 page was emitted |
| Fixed framework pages | 12 | exact static list above | none | no Discovery publication data is read |

Conclusion: the current sitemap covers fixed framework pages only. Dynamic Discovery inclusion is not implemented by the current build configuration; this is closed evidence, not a request to repair it.

The visible footer has a separate P1 product bug: its Sitemap link is `/sitemap`, while the generated file is `/sitemap.xml` and no `/sitemap` route was found (`prompt-dir-next@56a9eed:apps/web/src/custom/discovery/site-chrome.tsx:89-107`; `prompt-dir-next@56a9eed:apps/web/dist/client/sitemap.xml`). It remains downstream-owned and outside this PR.

## 3. Resource-type canonical inventory

`publicDirectoryTypes` names the complete source-declared set at `prompt-dir-next@56a9eed:apps/web/src/custom/discovery/resources/prompts/loader.ts:111-120`. `getResourceDetailPath` is its central public-detail map at `prompt-dir-next@56a9eed:apps/web/src/custom/discovery/resources/prompts/detail-path.ts:1-32`.

| Resource type | Primary detail entry / canonical | Compatibility entry | Redirect status | Internal link target |
| --- | --- | --- | --- | --- |
| `prompt` | `/prompt/:slug`; explicit route canonicalizes to itself | `/prompts/:slug`, `/item/:slug` | 301 for plural and item aliases | `/prompt/:slug` |
| `agent` | `/agent/:slug` via `/:kind/:slug` | `/agents/:slug`, `/item/:slug` | 301 | `/agent/:slug` |
| `dataset` | `/dataset/:slug` via `/:kind/:slug` | `/datasets/:slug`, `/item/:slug` | 301 | `/dataset/:slug` |
| `mcp` | `/mcp/:slug` via `/:kind/:slug` | `/item/:slug` | 301 for item alias | `/mcp/:slug` |
| `skill` | `/skill/:slug` via `/:kind/:slug` | `/skills/:slug`, `/item/:slug` | 301 | `/skill/:slug` |
| `tool` | `/tool/:slug` via `/:kind/:slug` | `/tools/:slug`, `/item/:slug` | 301 | `/tool/:slug` |
| `workflow` | `/workflow/:slug` via `/:kind/:slug` | `/workflows/:slug`, `/item/:slug` | 301 | `/workflow/:slug` |
| Other database `type` | no supported public detail route | `getResourceDetailPath` returns `/item/:slug` | 404, not a redirect | none approved |

Evidence: the generic route recognizes the listed singular and plural aliases and 301-normalizes non-canonical kinds (`prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/$kind/$slug.tsx:8-49`); the explicit Prompt route supplies `/prompt/:slug` canonical (`prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/prompt/$slug.tsx:7-25`); and `/item/:slug` 301s only when the type is in the detail map (`prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/item/$slug.tsx:5-12`). The public API validates a syntactic type string, not this seven-value route allow-list (`prompt-dir-next@56a9eed:apps/server/src/custom/discovery/public-read.ts:40-82`), so an unexpected published database type is a P1 downstream data/route consistency risk.

## 4. Internal link callers

All inspected resource-detail UI callers delegate to `getResourceDetailPath`; no caller was found that hand-assembles `/prompt/:slug`, `/item/:slug` or `/:kind/:slug` for a resource card.

| Caller | Evidence | Target behavior |
| --- | --- | --- |
| Discovery Card and share URL | `prompt-dir-next@56a9eed:apps/web/src/custom/discovery/resources/prompts/card.tsx:12-85` | one central detail path for media, Detail CTA and sharing |
| Ranking feature and row | `prompt-dir-next@56a9eed:apps/web/src/custom/discovery/resources/prompts/ranking-page.tsx:1-199` | one central detail path |
| Collection primary and selected resource | `prompt-dir-next@56a9eed:apps/web/src/custom/discovery/resources/prompts/collection-pages.tsx:1-144` | one central detail path |
| Sitemap | `prompt-dir-next@56a9eed:apps/web/vite.config.ts:12-34,119-137` | does not call product loaders and contains no resource detail URL |

The `prompt-dir-next@56a9eed:apps/web/src/custom/discovery/resources/prompts/README.md:3-20` documents this map as the sole typed canonical mechanism and explicitly calls `/item/:slug` an alias.

## 5. Redirect graph

| Source | Final target | Status / chain | Canonical at final target | Result |
| --- | --- | --- | --- | --- |
| `/item/:slug` for supported type | `/:kind/:slug` with singular kind | one 301 | final generic route canonicalizes to its own singular path | no loop or second hop in source graph |
| `/:plural-kind/:slug` | `/:singular-kind/:slug` | one 301 | final generic route canonicalizes to singular path | no loop |
| `/prompts/:slug` | `/prompt/:slug` | one 301 | explicit Prompt route canonicalizes to `/prompt/:slug` | no loop |
| `/:kind/category/:slug` and `/:kind/tag/:slug` for `mcp`, `prompt`, `skills` | `/category/:slug` or `/tag/:slug` with `type` query | one 301 | category/tag routes canonicalize to their non-query route | no loop |
| `/best-ai-mcp`, `/best-ai-prompts`, `/best-ai-skills` | `/ranking/:type` with ranking query | one 301 | ranking route canonicalizes to `/ranking/:type` | no loop |
| root legacy `ai-*-prompts` | `/category/:slug` with Prompt filter | one 301 | category route canonicalizes to `/category/:slug` | no loop |
| `/ai-*-prompts/:subslug` | `/category/:slug` with resolved taxonomy or category filter | one 301 | category route canonicalizes to `/category/:slug` | no loop |

All source-defined redirects in this graph specify 301; no 308 redirect was found in the inspected Prompt public routes (`prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/$slug.tsx:6-72`; `prompt-dir-next@56a9eed:apps/web/src/custom/discovery/resources/prompts/legacy-topic.ts:14-36`; `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/$kind/category/$slug.tsx:1-22`; `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/$kind/tag/$slug.tsx:1-22`). Unknown types and unknown legacy kinds return 404 rather than entering a redirect chain.

## 6. Gate outcome and follow-up boundary

- **Gate A — Governance/Test-only:** Conditional Go after the product owner accepts this URL Freeze. It may support only a separate RED-to-GREEN route ownership, reserved-segment, canonical-fixture or sitemap-parity test/ADR PR.
- **Gate B — Runtime/Data/URL:** No-Go. No public-read runtime extension point, API, DTO, Schema, Migration, Adapter, URL/canonical change, product migration or Cloudflare staging follows from this audit.
- **Future URL migration evidence:** Search Console coverage, indexed URL counts, backlink and organic landing-page inventory, a 301 plan and post-release crawl monitoring are deferred until a product proposes a URL or canonical change.

Phase 0.1 changes no product behavior. It closes evidence and preserves the separation: PR #51 is documentation-only and ends after this Phase 0 closure.
