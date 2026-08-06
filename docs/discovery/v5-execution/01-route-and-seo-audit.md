# Phase 0 — Route and SEO Audit

审计日期：2026-08-06。源码优先；`Uncertain` 表示本轮未在稳定源码证据中确认，不能当作迁移假设。

## 1. Baseline

| Repository | Branch / ref | Commit | 状态 | 用途 |
| --- | --- | --- | --- | --- |
| easystarter-template | `codex/discovery-v5-plan` | `a0f24ac0f2fc4b276a3f1984306fe2ad1bf829b8` | clean | 唯一可写的文档基线；PR #51 Draft |
| aibranding-easystarter | detached `origin/main` | `c5e2e376a20bab78d4e068a5e2b6a7668e8e73d0` | clean | 只读审计 |
| prompt-dir-next | `main` | `56a9eedbe8a4f494df6033e7fdf4ef1fdc2f2045` | clean | 只读审计 |
| url-next | detached `origin/main` | `4e3a90e407488eb3273f8c2f2b53d96c2d5b7136` | clean | Reference only，只读审计 |

## 2. AIBranding public paths

| URL | Route source | 动态参数 | 用途 / 数据来源 | canonical / robots / sitemap | 保留决定 | 风险 |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/(landing-page)/index.tsx` | — | marketing/home；具体读取本轮未展开 | Uncertain | Freeze | P1 SEO/home ownership |
| `/:slug` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/$slug.tsx:35-85` | `slug` | 仅 `*-domains` 静态 Domain landing / primary landing | 自 canonical；筛选、空结果 noindex | Freeze | P0，与任何根级动态 Discovery 路由冲突 |
| `/domains` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/domains/index.tsx:17-65` | query | Domain listing，`aibranding.domains` | canonical `/domains`；有筛选 `noindex,nofollow`；静态 facet 308 到根级 landing | Freeze | P0，筛选与 308 是生产 URL 合同 |
| `/domains/:slug` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/domains/$slug.tsx:8-63` | `slug` | Domain detail，`aibranding.domainDetail` | canonical `/domains/:slug` | Freeze | P0，已发布资产与交易详情 |
| `/category`、`/category/:slug` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/category/index.tsx`; `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/category/$slug.tsx:8-36` | `slug` | Domain category hub，`aibranding.category` | detail canonical `/category/:slug`，`noindex,follow` | Freeze | P1，不能被通用 category route 接管 |
| `/rankings`、`/rankings/:type` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/rankings/index.tsx`; `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/rankings/$type.tsx:8-44` | `type` | domains / brand ideas / logos 排名，读取 `aibranding.rankings` | canonical `/rankings/:type` | Freeze | P1，三个投影与统计指标不同 |
| `/brand-ideas`、`/brand-ideas/:slug` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/brand-ideas/` | `slug` | Brand idea public projection | Uncertain | Freeze | P1，非 Domain Item |
| `/templates/logos`、`/templates/logos/:facet/:slug` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/templates/logos/` | `facet`,`slug` | Logo catalogue / facet page | Uncertain | Freeze | P1，多段 URL 已占用 |
| `/templates/design-md`、`/templates/design-md/:slug` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/templates/design-md/` | `slug` | Design template projection | Uncertain | Freeze | P1 |
| `/templates/figma` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/templates/figma/` | — | Figma templates | Uncertain | Freeze | P2 |
| `/favorites` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/favorites.tsx` | — | User-linked public page | Uncertain | Internal/Non-public contract | P1，不能进入公开 Foundation |
| `/blog`、`/blog/:slug`、`/blog/category/:slug` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/blog/` | `slug` | Marketing/blog | source-specific; blog routes set own head | Freeze | P1，独立内容域 |
| `/auth/*`、`/admin/*`、`/billing/*`、`/dashboard/*`、`/settings/*` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/(auth)/`; `aibranding-easystarter@c5e2e37:apps/web/src/routes/_admin/`; `aibranding-easystarter@c5e2e37:apps/web/src/routes/_authed/(dashboard)/` | varies | Platform/account operations | robots blocks admin/dashboard/settings | Internal/Non-public | P0 permission/transaction |
| `/sitemap.xml`、`/robots.txt` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/sitemap[.]xml.ts:5-24`; `aibranding-easystarter@c5e2e37:apps/web/src/routes/robots[.]txt.ts:4-45` | — | dynamic sitemap / robots | sitemap cacheable; robots disallows API, admin, query URLs | Freeze | P1 SEO |

Evidence: public router exposes distinct `domains`, `domainDetail`, `category`, `brandIdeas`, `logos`, `designs`, `rankings`, sitemap, favorites, inquiry and analytics operations at `aibranding-easystarter@c5e2e37:apps/server/src/modules/aibranding/router.ts:37-164`.

## 3. Prompt Dir public paths

| URL | Route source | 动态参数 | 用途 / 数据来源 | canonical / robots / sitemap | 保留决定 | 风险 |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/(landing-page)/index.tsx` | — | Prompt directory home | Uncertain | Freeze | P1 |
| `/:slug` | `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/$slug.tsx:31-87` | `slug` | Static/SEO page plus legacy redirects | self canonical when page exists; redirects old ranking/category paths | Freeze | P0, root dynamic route |
| `/:kind/:slug` | `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/$kind/$slug.tsx:8-49` | `kind`,`slug` | Typed resource detail | plural/legacy kind 301 normalizes to `getResourceDetailKind` result | Freeze | P0, canonical differs by resource type |
| `/prompt`、`/prompt/:slug` | `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/prompt/` | `slug` | Prompt list/detail | detail canonical `/prompt/:slug` | Freeze | P0, only prompt is proven here; `/prompts` is not canonical |
| `/item/:slug` | `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/item/$slug.tsx:5-12` | `slug` | Compatibility detail route | 301 to `/:kind/:slug` | Freeze | P1, historical link contract |
| `/discover` | `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/discover.tsx` | query | Search/filter public resources | `noindex,follow` | Freeze | P1 |
| `/category`、`/category/:slug` | `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/category/` | `slug` | Category list/hub | hub indexes only with results | Freeze | P1 |
| `/tag`、`/tag/:slug` | `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/tag/` | `slug` | Tag list/hub | tag route threshold controls robots | Freeze | P1 |
| `/collection`、`/collection/:slug` | `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/collection/` | `slug` | Collection pages | collection route controls robots by count | Freeze | P1 |
| `/ranking`、`/ranking/:type` | `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/ranking/` | `type` | Prompt resource ranking | type/page query is product-specific | Freeze | P1, singular differs from AIBranding |
| `/agents` `/datasets` `/mcp` `/skills` `/tools` `/workflow` | controlled route files under `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/` | query | Type-specific resource list pages | Uncertain | Freeze | P1, controlled product taxonomy |
| `/ai-*-prompts/:subslug` | e.g. `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/ai-code-prompts/$subslug.tsx` imports `redirectLegacyTopic` | `subslug` | legacy topic entrances | redirect behavior; exact canonical per source | Freeze | P1 |
| `/api/discovery/*` | `prompt-dir-next@56a9eed:apps/server/src/custom/discovery/public-api.ts:18-72`; mounted `prompt-dir-next@56a9eed:apps/server/src/index.ts:143-145` | endpoint-specific | direct Hono public D1 read | not a public Web canonical | Internal/Non-public | P1, API shape is product-owned |
| `/auth/*` `/admin` `/billing/*` `/blog/*` | route source tree | varies | platform/marketing | blog is `noindex,nofollow` in current sources | Internal/Non-public | P0/P1 |
| `/sitemap.xml` | Vite sitemap config at `prompt-dir-next@56a9eed:apps/web/vite.config.ts:12-34,94-137`; generated output at `prompt-dir-next@56a9eed:apps/web/dist/client/sitemap.xml` | — | build-generated sitemap | **Closed in Phase 0.1:** local `pnpm build` generated 12 static URLs and zero Discovery URLs | Freeze | P1, dynamic Discovery pages are not currently discoverable through this sitemap |

## 4. url-next paths — Reference only

| URL | Route source | 动态 parameters | evidence / SEO | 保留决定 |
| --- | --- | --- | --- | --- |
| `/:type` | `url-next@4e3a90e:apps/web/src/routes/_public/(marketing)/$type.tsx:10-27` | `type` | only controlled experimental type, noindex, canonical `/websites` | Reference only |
| `/:type/:category` and `/:type/:category/:subCategory` | `url-next@4e3a90e:apps/web/src/routes/_public/(marketing)/$type/$category.tsx`; `url-next@4e3a90e:apps/web/src/routes/_public/(marketing)/$type/$category/$subCategory.tsx:10-27` | three dynamic segments | controlled experimental product type, noindex | Reference only |
| `/websites` and two-level category paths | `url-next@4e3a90e:apps/web/src/routes/_public/(marketing)/websites/` | category/subCategory | concrete two-level category layout | Reference only |
| `/item/:slug` | `url-next@4e3a90e:apps/web/src/routes/_public/(marketing)/item/$slug.tsx:20-94` | `slug` | historic alias 301 to canonical slug; JSON-LD and cache headers | Reference only |
| `/topics/:slug` `/tag/:slug` `/collection/:slug` `/blog/:slug` | corresponding route sources | `slug` | product-specific content routes | Reference only |
| `/sitemap.xml` | `url-next@4e3a90e:apps/web/src/routes/sitemap[.]xml.ts:4-43` | — | static + dynamic directory entries | Reference only |

## 5. Dynamic route conflict matrix

| Pattern | Existing owner(s) | Conflict conclusion |
| --- | --- | --- |
| `/:slug` | AIBranding static domain landings; Prompt static/SEO page and legacy redirects | P0: Foundation must never register root dynamic slug |
| `/:kind/:slug` | Prompt typed resource details | P0: cannot reserve generic type detail route |
| `/:type` / `/:type/:category` / `/:type/:category/:subCategory` | url-next controlled experimental paths | Reference proof that dynamic namespaces need a closed registry |
| `/domains/:slug` | AIBranding Domain detail | Freeze; cannot be replaced by shared detail route |
| `/prompt/:slug` | Prompt canonical detail | Freeze; does not justify `/prompts/:slug` |
| `/item/:slug` | Prompt compatibility; url-next canonical detail | product semantics differ |
| `/category/:slug` | AIBranding and Prompt | same string, different data and robots policy |
| `/ranking/:type` vs `/rankings/:type` | Prompt singular vs AIBranding plural | no forced normalization without 301/sitemap parity |

## 6. Reserved segment registry

| Class | Segments |
| --- | --- |
| Platform | `api`, `rpc`, `auth`, `admin`, `billing`, `docs`, `dashboard`, `settings`, `sitemap.xml`, `robots.txt` |
| Existing product public | `category`, `tag`, `collection`, `ranking`, `rankings`, `search`, `discover`, `blog`, `favorites`, `offers`, `tools`, `topics`, `websites`, `domains`, `prompt`, `item`, `listing`, `templates`, `brand-ideas` |
| Future namespace eligibility | None is approved in Phase 0. Any future namespace must be absent from every product's inventory and pass collision tests. |

## 7. Current URL → candidate canonical

| Current URL family | Current canonical evidence | Candidate future URL | First v5 | Required before any change | SEO risk |
| --- | --- | --- | --- | --- | --- |
| AIBranding `/domains/:slug` | route head `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/domains/$slug.tsx:28-37` | same | Freeze | inventory, backlink/index audit, 301 map, sitemap/HTML parity | P0 |
| Prompt `/prompt/:slug` | route head `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/prompt/$slug.tsx:13-20` | same; `/prompts/:slug` is only an unapproved idea | Freeze | prove all current detail canonicals and aliases | P0 |
| Prompt `/:kind/:slug` | normalization redirect `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/$kind/$slug.tsx:24-48` | same | Freeze | type-by-type sitemap and link audit | P0 |
| Prompt `/item/:slug` | 301 `prompt-dir-next@56a9eed:apps/web/src/routes/_public/(marketing)/item/$slug.tsx:5-12` | same redirect | Freeze | preserve redirect and canonical parity | P1 |
| AIBranding `/ranking(s)/:type` | `aibranding-easystarter@c5e2e37:apps/web/src/routes/_public/(marketing)/rankings/$type.tsx:26-40` | same | Freeze | ranking URL/index audit; no generic ranking route | P1 |
| url-next aliases | `url-next@4e3a90e:apps/server/src/modules/directory/router.ts:264-285`; `url-next@4e3a90e:apps/web/src/routes/_public/(marketing)/item/$slug.tsx:20-30` | Reference only | No migration | n/a | P2 |

## 8. Phase 0.1 closure

Prompt's build output, every supported resource-detail canonical, link callers and redirect graph are now fixed evidence in [06-prompt-canonical-and-sitemap-closure.md](./06-prompt-canonical-and-sitemap-closure.md). The URL Freeze remains in force: the closure records current behavior; it does not authorize a route, canonical, sitemap or downstream change.
