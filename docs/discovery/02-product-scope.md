# 02 — Product Scope（产品定位与范围）

状态：提案 v1；Phase 0 审计后部分范围已降级为 Deferred（尚未实施）。
基线：EasyStarter v0.4.10

> Phase 0 的可核验结论以 [v5-execution/05-phase0-decision-and-phase1-scope.md](./v5-execution/05-phase0-decision-and-phase1-scope.md) 为准。本文件中的 List/Detail 合同、分页与 Listing 壳只保留为候选方向，并非已批准的 Foundation 范围。

---

## 1. 定位

**Discovery Foundation 是 EasyStarter 的 First-party Optional Product Module，不是 Base Core。**

四层架构，每层职责不可越界：

| 层 | 内容 | 归属 |
| --- | --- | --- |
| EasyStarter Core | Auth、Composition、Config、D1 基座、Jobs、Billing、Storage、Audit | 上游平台，不因 Discovery 修改内部实现 |
| Shared Listing UI | ListingShell、FacetRail 壳、Toolbar、Grid/List 容器、Empty/Error/Loading、Mobile Drawer | `apps/web/src/components/listing/*`，低依赖、无业务字段 |
| First-party Discovery Foundation | 候选的公共读取扩展点、路由保留段校验、SEO/缓存测试工具 | 尚未创建；须经单独治理 PR 批准 |
| Vertical / Product Adapter | Prompt、Novel、Anime、Movie、Domain、Supplement 等 | 各产品仓库或 `modules/<vertical>` 扩展 |

硬性约束：

- `siteModules.discovery` 关闭时，普通 SaaS Profile 的 API 面、Sitemap、导航、Migration 验收结果**零回归**。
- Discovery 不修改 Auth、Billing、Credits、Jobs、Provider 内部实现；异步工作只通过 `registerJobHandler` / `context.jobs.create` 消费 Jobs 公共接口。
- 公共读取不初始化 Better Auth、Payments、Credits、Storage、Admin Context。
- 浏览器不直接访问 D1；Web 一律经 API Worker。
- URL 是公开筛选状态的唯一来源；第一页服务端渲染。
- 能力晋升规则：**只有经两个彼此独立、持续维护的下游产品验证的能力才可进入 Foundation Core。** v5 的两个明确验证对象是 AIBranding 与 Prompt Dir；URL Next 作为第三个参考，不能单独驱动抽象。
- 上游只提供稳定且小的读取契约、路由安全规则与可选扩展点；各下游保留自己的领域表、URL、UI、运营和商业状态。不得把 AIBranding 与 Prompt Dir 的既有实现融合成一套“万能目录”。

## 2. 服务的垂直场景

Foundation 可以逐步服务 AI Tools/Prompt、小说、Anime/Manga、Movie/TV、Games、Courses/Resources、Supplements、Jobs/Companies、SaaS/Products；v5 首期以 AIBranding 与 Prompt Dir 的共同重建为约束，不为假想垂直预建能力。

设计输入：NovelUpdates（Series Finder、Genre Include/Exclude、Tag AND/OR、Release Timeline）、MyAnimeList（多内容类型、Seasonal、关系图）、TMDB（Search/Discover/Find 分离、External ID、Collections）。

## 3. MVP（v0.5.0 验收范围）

1. **Route ownership**：保留段、动态段冲突检测、canonical/sitemap 回归工具；Foundation 不注册公开 Web 路由。
2. **公共读取扩展点候选**：仅可先做 RED contract test 与 ADR；List / Detail 私有 Adapter 合同尚未获准。
3. **查询护栏候选**：稳定分页、参数格式、长度/数量上限与标准错误格式须由两个产品先证明同构。
4. **Listing 壳候选**：现有 `ListingShell` 可作证据，但 Toolbar、Drawer 和 URL-state 工具尚未被批准提取。
5. **双 Adapter 与 parity fixture**：AIBranding、Prompt Dir 先各自保留数据表、URL、页面与 API；`url-next` 只作为路由/别名/两级分类参考。
6. **Schema/Ranking/Alias/Admin/Import 延后**：只有两个私有 Adapter 已证明输入、输出、错误语义、生命周期和测试方式同构后，才单独立项。

## 4. 非目标（明确不做）

- 用户侧 Reading List / Watchlist / 进度 / 评分 / 评论 / 收藏（未来独立 Interaction 模块，经 `item_id` 引用）。
- 付费 Listing / Sponsor 状态机（未来独立 listings/sponsorships 模块，绝不进内容行）。
- AI enrichment 管线、SEO keyword/cluster 工厂、万能页面生成器。
- 用户公开提交与审核工作流（归未来 Ingress/Moderation 模块；MVP 内容来源只有 Admin + Import）。
- 多租户内容隔离（Discovery Core 只管理全局目录）。
- 全文搜索引擎替换（FTS5/Vectorize 经 `DiscoverySearchProvider` 接口后置）。
- 内容级 i18n（表结构预留讨论，见 12 号文档，不进 MVP）。

## 5. 后续可选能力（Optional Capabilities，双 Adapter 驱动后置）

按依赖顺序：

1. `collection` + `collection_item`（策展集合）
2. `relation`（续作/衍生/相似——Novel/Anime 驱动）
3. `item_update`（章节/剧集/版本更新流——Novel 驱动）
4. `alias_redirect`（slug 变更 301）
5. `external_reference` 独立表 + `/find/:source/:externalId`（TMDB 式 Find；MVP 用 `item_source.external_id` 满足单来源反查）
6. `seo_page`（编译型 SEO Landing）
7. `external_link`（详情页外链行）
8. Rank/Trending 物化视图或计数表
9. R2 媒体 ingest（经 `modules/assets`）
10. Interaction 模块（favorites/lists/reviews）、Ingress/Moderation 模块
