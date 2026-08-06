# 01 — Reference Audit（参考仓库审计）

状态：历史提案；Phase 0 审计已完成，本文不再作为实施证据。
基线：EasyStarter `v0.4.10`（tag `d0a5cc19969d13b51630c7f761d7c4e75b54113a`，2026-08-06）
审计对象：五个仓库。AIBranding 与 Prompt Dir 是 v5 的两个重建目标；URL Next 是第三个路由与信息架构参考，不在第一批迁移承诺内。

> 可复核的当前证据、固定 commit 和 Phase 1 Go/No-Go 以 [v5-execution/05-phase0-decision-and-phase1-scope.md](./v5-execution/05-phase0-decision-and-phase1-scope.md) 及同目录四份审计为准。本文的本地工作副本描述已移除，不得用于实现。

| 代号 | 路径 | 形态 |
| --- | --- | --- |
| ES | `easystarter-template@d0a5cc1` | 上游模板，Turborepo + TanStack Start + Hono/oRPC + D1 |
| PD | 历史 Next.js + Sanity 参考，未纳入本轮固定基线 | Mkdirs 演化版（"Universal Content Discovery Engine"） |
| PDT | `prompt-dir-next@56a9eed` | PD 向 TanStack/D1 的产品迁移 fork（基于 2026-07 早期 EasyStarter 存档） |
| AB | `aibranding-easystarter@c5e2e37` | 域名/品牌发现类下游产品（v0.4.x 风格模块化） |
| URL | `url-next@4e3a90e` | 网站/主题/收藏类目录产品，提供多层 URL 与 canonical 实战参考 |

另有 PD 同目录的 `generic-discovery-template`（Next.js + Drizzle/Postgres 通用化尝试，未完成），本文记为 GDT。

重建原则：不把任一下游的产品代码搬进上游；用 AIBranding 与 Prompt Dir 共同实现并验证一个可选 Discovery Foundation。URL Next 只在其能力也被前两者需要时才成为第三个验证对象。

---

## 1. 各仓库现状

### 1.1 ES（上游 v0.4.10）

- **产品模块注册表为空**：`apps/server/src/modules/index.ts` 只有 `export const moduleRouters = {}`。`modules/` 下现存 `jobs`、`assets`、`audit`、`capabilities` 均为平台模块（`template-kit/repository-facts.json` 标记为 platform roots）。
- **Listing Shell 只是 UI 壳**：`apps/web/src/components/listing/*`（shell/facet-rail/toolbar/grid/search-input/sort-select/load-more/empty/error/loading/filter-drawer + `listing-types.ts` 协议类型）。demo 路由 `_public/(marketing)/listing/` 读内存数据 `configs/template-catalog.ts`，筛选状态用 `useState`，**没有 `validateSearch`、没有 loader、没有服务端模块、没有 D1 表**，且 `robots: noindex,nofollow`。
- **公共请求路径**：oRPC `/rpc/*` 与 `/api/*` 每次命中都执行 `createContext()`（`apps/server/src/lib/context.ts`）——D1、Better Auth session 查询、软删除检查，条件性初始化 storage/email/payments/entitlements/capabilities/jobs/credits。`publicProcedure` 不要求登录，但**不跳过 session 解析**。轻量先例是 `register-email-routes.ts`（只注入 email service），且 `create-app.ts` 保证特定 API 在通用 RPC 之前注册。
- **Profile**：`directory`（D1+Queue+DLQ+Cron，无 R2/Billing）与 `directory-lite`（仅 D1）已是为目录类产品准备的基础设施档位；Profile 只切基础设施 Feature，产品设置在 `packages/app-config/src/product-config.ts`。
- **DB 规范**：`apps/server/src/db/README.md` 分离 structural migrations / data-migrations / seeds / backfills / repairs；migrations 现至 `0020_cultured_tattoo.sql`（v0.4.9 资金操作与 Recovery 加固）。
- **边界执法**：`template-kit/repository-facts.json` + `pnpm check:boundaries`（web 禁止 import Drizzle/server db；产品模块禁止 import provider SDK；core 禁止 import 产品模块）。
- **SEO 设施**：`apps/web/src/utils/seo.ts`（canonical/robots/OG/hreflang/JSON-LD 均支持），sitemap 由 vite 插件生成（seed 页面清单不含 listing/blog），`public/robots.txt` Disallow `/api/`、`/rpc/`。
- **既有 Discovery 痕迹**：`docs/mysaas-discovery-module-spec.md`、`docs/mysaas-discovery-listing-plan.md`、`docs/golden-paths/directory.md` 为设计文档；`apps/web/src/custom/discovery/README.md` 是空占位。**服务端 discovery 模块与表不存在。**

### 1.2 PD（prompt-dir，Sanity 版）

Sanity schema 注册于 `src/sanity/schemas/index.ts`。核心类型：`item`（巨型文档）、`category`（+`group`）、`tag`、`taxonomy`（带 `taxonomyKey` 与 parent）、`collection`、`source`、`externalLink`、`relation`、`seoPage`、`seoKeyword`、`seoCluster`、`itemUpdate`、`review`、`rating`、`redirect`、`importJob`、`aiEnrichmentJob`。

- 查询为服务端 GROQ 动态拼接（`src/data/item.ts` `buildQuery`）：tag/taxonomy 多值全 AND；facet-engine（`src/modules/facet-engine/*`）支持同维度 `any`（OR）/`all`（AND）两种模式；排序白名单 `publishDate/name/copyCount/favoriteCount/aiRating`；offset 分页每页 12。
- SEO：sitemap 汇总实体页 + SEOPage（`noIndex != true`）；`shouldNoIndexSearchPage` 对任何带 query string 的页面 noindex（白名单为空）；**无 JSON-LD 结构化数据**；索引策略文档 `docs/seo-index-policy-v2.md` 与实现存在 `noindex,follow` vs `index:false,follow:false` 的不一致。
- 提交/发布：草稿 Item 即提交，可见性依赖 `defined(publishDate)` 而非干净的 publish_status 枚举；free/pro/sponsor 三套状态机 + Stripe order 引用直接长在 Item 上。

### 1.3 PDT（prompt-dir-tanstack）

基于 2026-07-13 导入的 EasyStarter 存档（无 `template-kit/`、无 `GOVERNANCE.md`、无 `modules/`），Discovery 以**附加式 `custom/` 栈**实现，未 fork auth/billing/credits：

- **Schema**（`apps/server/src/db/schema/discovery.ts`，migrations 0018/0019）：`discovery_document`（原始快照，raw_json）、`discovery_resource`、`discovery_category`、`discovery_tag`、`discovery_taxonomy`（复合 PK `(taxonomy_key, slug)`）、三张 junction、`discovery_collection` + junction、`discovery_source`、`discovery_resource_link`。全部用复合 PK/唯一索引，无正式外键。
- **公共 API**：Hono REST `GET /api/discovery/*`（resources/detail/categories/tags/taxonomies/collections/sources/pages/goals），挂载于 `apps/server/src/index.ts`，**在 auth-heavy context 之前**——即"公共读取不初始化 Auth"已在此仓库验证可行。
- **查询层**（`public-read.ts`，~834 行）：手写 `parseDiscoveryFilters()`——slug 正则白名单、type 白名单、tag/taxonomy 最多 12 个值、q 最长 200、page 上限 200、pageSize 上限 48、排序白名单；EXISTS 联查走复合索引。**分页缺陷**：`limit = page * pageSize` 累计式读取，非标准分页。
- **Web**：thin route → thick adapter；`validateSearch` + Zod schema（`resources/prompts/search.ts`）、loader 经 server function 调 REST、`buildSeoHead` 出 canonical/robots；tag 页 count ≤ 5 时 noindex。Listing 壳组件存在但**实际列表页未接线**（用了自有 `pd-*` CSS 壳）。
- **导入**：CLI 管线（collect → JSON → SQL → 本地/远程 D1），`hidden = record.hidden ?? (aiRating < 3)` 做发布门。**无 Admin CRUD、无提交流程、无 R2 媒体管线、无内容 i18n。**

### 1.4 AB（aibranding-easystarter）

v0.4.x 风格下游：产品代码在 `apps/server/src/modules/aibranding/`（domains/logos/designs/brand-ideas/favorites/inquiries + router/repository）。

- **公共读取全部挂 `publicProcedure`**（`aibranding-easystarter@c5e2e37:apps/server/src/modules/aibranding/router.ts:37-164`）——即该产品的匿名目录流量目前全走完整 oRPC Context；这不否定 Prompt Dir 已有 direct Hono public-read 路径。
- **Web 已验证的模式**：`validateSearch` + `stripSearchParams` 默认参数清理；筛选组合命中静态 slug 时 308 重定向到 Landing 页；筛选页 `noindex,nofollow`。重定向条件散落在各 Route 文件内，未抽取统一层。
- Domains 页的 facet（Extension/Prefix/Suffix/Price Range/Name Length/Quick Filter）与 Domain Card 均为垂直专属，佐证"单一 Listing/Card 模式不可能覆盖全部垂直"。

### 1.5 GDT（generic-discovery-template）

Drizzle/Postgres 的通用化尝试（`src/server/db/schema/core.ts`）：`items`（含 `publish_status`）、`categories`（parentId）、`tags`、`taxonomies`（`UNIQUE(taxonomy_key, slug)`）、`collections`、`sources`、`seo_pages`（`target_filters_json` + `is_indexable`）、`item_updates` + 四张 junction。文档（`docs/data-model.md`）明确"JSON 仅用于 import/AI 载荷，禁止把 taxonomy 塞进 JSON"。实现深度浅（~31 个 TS 文件），Relation/ExternalLink/Submission 等只有文档。**概念上是四仓库中最干净的起点。**

---

## 2. 可复用清单

| 来源 | 资产 | 复用方式 |
| --- | --- | --- |
| PDT | 表关系结构（taxonomy 复合 PK、junction 索引方向）与查询经验 | 概念复用，字段按 04 号文档重设计 |
| PDT | `parseDiscoveryFilters` 的白名单/上限模式 | 改写为 Zod + Query AST 验证 |
| PDT | Hono 公共 REST 挂载在 auth context 之前的模式 | 直接采用（规范化为注册器） |
| PDT | CLI 导入管线（collect → JSON → SQL → D1） | 直接移植为 ops 脚本 |
| PDT/ES | `docs/mysaas-discovery-*` 设计文档 | 作为本套文档的输入 |
| ES | `components/listing/*` Slot-based 壳 + `listing-types.ts` | 直接使用，扩展多值 Facet 类型 |
| ES | `utils/seo.ts`、sitemap 插件、robots.txt、i18n、`modules/assets`、`registerJobHandler` | 直接使用，不修改 |
| PD | facet any/all 语义、Source vs ExternalLink 分离、Relation 图、索引策略（静态 hub 可索引、任意 facet 组合 noindex） | 概念纳入合同 |
| GDT | `publish_status` 与 billing 分离、`seo_pages` 目标筛选结构化、JSON 边界规则 | 概念纳入 Schema 设计 |
| AB | `validateSearch` + `stripSearchParams`、facet→静态 Landing 308、robots 控制 | 模式采用，重定向逻辑抽取为统一层 |

## 3. 不可直接迁移

- PD 的一切 Sanity schema 与 GROQ 查询（存储模型不同）；portable-text 页面体。
- PDT 的 `discovery_resource` 字段表（混入 `ai_rating/copy_count/favorite_count/sponsored`）；累计式分页；`goal`/Ideas 的 `json_extract` 查询；`custom/` 目录位置（上游要求 `modules/`）；`apps/server/src/index.ts` 直接挂载方式（需变成受治理的注册器触点）。
- PDT/AB 的 Prompt/Domain 专属 UI（卡片、CSS、facet 控件、工具页、legacy SEO 重定向表）——留在各自 Adapter。
- GDT 的 Postgres 方言代码（`pg-core`）。

## 4. 过度设计部分（明确拒绝）

1. **Item 巨表**：PD 的 item 文档吸收 billing（pricePlan/三套状态机/order）、sponsor（日期窗）、AI（aiSummary/aiRating/aiReview）、媒体、SEO 于一身；PDT 的 resource 也已混入 aiRating/copyCount/sponsored。内容行上不得出现计费与赞助状态机。
2. **"仅改配置换垂直"的万能配置**：PD 的 `siteConfig.discovery` 巨型对象 + 硬编码 prompt 路由助手 + `publicStaticPages` 清单，宣称通用实则处处硬编码。不做万能页面生成器。
3. **SEO keyword/cluster 工厂**：`seoKeyword`/`seoCluster` + Semrush 管线是产品级 SEO 运营系统，不属于 Foundation。
4. **四套并行分类体系无归属规则**：category/tag/taxonomy/itemType 同时存在且代码无 ownership 约定。Foundation 必须写明三者分工（见 03 号文档）。
5. **CMS 文档型 Job 台账**：`importJob`/`aiEnrichmentJob` 作为 CMS 类型但无真实执行器。可重试后台工作只走 ES 的 Jobs 模块。

## 5. 缺失部分（四仓库均未提供，需要新建）

- 标准分页合同（page/pageSize 与 Opaque Cursor + tie-breaker）与 Facet Count 语义定义。
- Include/Exclude 与同 key OR / 跨 key AND 的版本化 Query AST。
- 发布生命周期（status/revision 乐观锁）与业务命令式 Admin API。
- External Reference（TMDB 式 Find）、Alias/301 表、编译型 SEO Page。
- 内容 i18n 策略、JSON-LD 输出、运行时 sitemap 数据源（实体页进 sitemap）。
- Discovery 关闭时零回归的 Profile 矩阵验收。
