# 12 — Open Decisions（待产品负责人决策）

状态：提案 v1（尚未实施）
说明：只列真正需要产品负责人拍板的问题。每项含推荐默认值、替代方案、成本与风险。此前标注为“已确认”的内容应视为设计默认值，须由 AIBranding 与 Prompt Dir 的真实重建验证后才能成为 Foundation 承诺。

> Phase 0 已把共享 Schema、路由、分页和 UI 抽取均列为 Deferred。请先阅读 [Phase 0 决定](./v5-execution/05-phase0-decision-and-phase1-scope.md)；本文各“默认”均不得直接转化为实现。

---

## D1. Resource Type、Route Namespace 与 Vertical Key（待双 Adapter 证据）
- **默认**：三者分离。`resourceType` 是内部类型，`routeNamespace` 是产品公开 URL 段，`verticalKey` 是 Adapter 归属；当前不定义共享唯一索引或公开路由。
- **风险**：把它们合成一个 `type` 会迫使下游为了共享模型改历史 URL，或把根级动态路由误当成 Foundation 能力。

## D2. Slug 唯一范围（Deferred Schema Candidate）
- **当前决定**：先审计每个产品的 slug、URL、canonical 与唯一性；不得预设共享 `UNIQUE(resource_type, slug)` 或要求 Prompt 改为 `/prompts/:slug`。
- **未来门槛**：共享唯一规则必须随共享 Schema ADR 一并证明，且不会破坏现有 canonical 或历史链接。

## D3. Category 全站共享还是垂直独立（已确认：垂直命名空间独立）
- **默认**：`UNIQUE(vertical_key, slug)`；romance 在 novel/anime/movie 各自独立。
- **替代**：全站共享词表——多垂直语义冲突，PD 已证明混乱。
- **成本**：跨垂直聚合页需显式 join，多数产品不需要。

## D4. 多 Source 与 External ID（已确认：能，指定 Primary）
- **默认**：`item_source` 多边 + 恰一 `is_primary`；external_id 挂在边上；独立 `external_reference` 表按需后置。
- **替代**：Item 上单 source 列——Novel/Movie 场景立刻不够用。
- **风险**：is_primary 应用层约束需命令层守护（无法用 SQLite 部分唯一索引优雅表达时用触发式校验）。

## D5. 同 Taxonomy Key 多值默认 OR 还是 AND（已确认：同 key OR，跨 key AND）
- **默认**：同 key include 默认 OR，`mode=all` 显式 AND；跨 key AND；exclude NOT EXISTS。
- **替代**：PD/PDT 的全 AND——用户多选 genre 时结果急剧归零，与 NovelUpdates/TMDB 习惯相悖。

## D6. Facet Count 是否排除自身筛选（已确认：是）
- **默认**：self-excluding；opt-in、限 4 组、可缓存（05 §6 成本护栏）。
- **替代**：全条件后计数（便宜但 UI 大量显示 0）；不提供 counts（MVP 可接受的降级路径——若 D1 压测不达标，先去掉 counts 而不是改语义）。

## D7. 用户提交内容的归属（已确认：Discovery Core 只管全局目录）
- **默认**：公开提交/审核属未来 Ingress/Moderation 模块，产出经 Admin 命令进入目录；MVP 内容来源仅 Admin + Import。
- **风险**：无。避免 PD"草稿 Item 即提交"导致生命周期与内容表纠缠。

## D8. `/` 归属（待首个 Pilot 决定）
- **推荐默认**：不在首个 Pilot 自动接管 `/`。只有真实目录产品需要 Portal 首页、并完成路由冲突与 sitemap 验收时，才评估由 Product Profile 推导：

| Profile | `/` 归属 |
| --- | --- |
| full-saas | marketing |
| account-app | marketing |
| directory | portal |
| directory-lite | portal |

- 若实施推导逻辑，放在 Discovery web 模块内（读取 `@repo/app-config` 的激活 Profile），不改 Profile 定义本身。
- 两种模式都必须在路由冲突、sitemap、canonical 测试矩阵内覆盖。
- **风险**：下游常需保留营销首页；在首个 Pilot 前自动推导会把产品决定伪装成模板默认值。

## D9. 公共读取传输（待双 Adapter 比较）
- **默认**：Foundation 只约束轻量公共读取不初始化 Auth/Payments/Credits；AIBranding 和 Prompt Dir 暂可保留不同 Hono/oRPC/handler 路径。
- **升级条件**：两个 Adapter 都受益且错误/缓存/版本语义一致时，再决定是否统一 `/api/discovery/v1/*`。

## D10. `siteModules.discovery` 是否升级为 platform composition flag
- **默认**：不升级，留在 product-config；`registerModuleHttpRoutes` 读 product 设置。
- **替代**：升级为 composition.modules.discovery——获得 profiles:check 级别的资源校验，但触碰 `platform-composition.ts` + profile fixtures，属核心专项 PR。
- **建议**：v0.5.0 验收若证明 Profile 矩阵测试足够，则维持默认。

## D11. 全文搜索引擎时机（已确认：MVP 用 LIKE，触发条件与预算锁定如下）
- **决定**：MVP 只实现 `search_text` LIKE，藏在 `DiscoverySearchProvider` 接口后。**不并行实现** LIKE / FTS5 / Vectorize / 外部搜索中的多个——未来把 LIKE Adapter 整体替换为 FTS5 Adapter。
- **FTS5 触发条件**（满足任意一项即立项 FTS5 PR）：
  1. 已发布 Item 达到约 10,000–20,000 条；
  2. 单次搜索平均 `rows_read` 超过 5,000；
  3. 搜索查询 P95 延迟连续一周超过 150–200 ms；
  4. 搜索每日消耗超过 D1 读取额度的 20%；
  5. 产品需要真正的相关度排序、词组匹配或多标题（别名）搜索。
- **FTS5 实施预算**：1–2 个独立开发日；单独一个 Migration；范围只索引公开、已发布 Item（publish/unpublish 命令同步维护索引行）。
- Vectorize / 外部搜索不在当前路线图，仅当 FTS5 无法满足语义检索需求时另行立项。

## D12. 内容 i18n
- **默认**：MVP 单语言内容（UI 文案走 packages/i18n 不变）；Schema 不预建翻译表。
- **替代**：`discovery_item_translation(item_id, locale, title, summary, search_text)` 侧表——设计已预留（不动 Core 主键），需求出现时以 Capability Migration 落地。
- **需拍板**：首个多语言站点的时间点；per-locale slug 是否需要（影响 URL 与 sitemap hreflang）。

## D13. 导入与手工编辑的字段级归属
- **默认**（MVP）：Item 级——手工编辑过的 Item 默认跳过导入更新，`force` 覆盖。
- **替代**：列级 provenance（每字段记 manual/import）——精确但表宽膨胀。
- **需拍板**：运营团队规模化后是否需要列级；建议先收集 v0.5.0 运营数据。

## D14. CDN 缓存与失效的初始档位（Cloudflare Free）
- **决定**：生产域名/CDN 为 Cloudflare **Free**；Workers 为 Free 或 Paid（未来可加 Workers 增值服务）。
- **事实**：Free 支持 URL、Hostname、Tag、Prefix 与 Purge Everything；hostname/tag/prefix/purge-everything 的账户级限额为每分钟 5 请求、bucket 25。详见 [Cloudflare 官方文档](https://developers.cloudflare.com/cache/how-to/purge-cache/)。
- **推论**：TTL 是安全兜底；真实缓存实现出现后，优先 Cache-Tag 批量失效，较大导入可用 prefix purge，单页可用 URL purge。所有操作应批量和限流，本地无凭证时静默跳过。

## D15. Rank/Trending 数据来源（后置）
- **当前决定**：Foundation 不在 v5 MVP 中定义 ranking DTO、表、刷新任务或公开路由。AIBranding 与 Prompt Dir 保留现有排行榜实现和 URL。
- **升级条件**：两边的输入、输出、排序、刷新、缓存和测试方式均同构；仅“都有排行榜”不构成证据。

## D16. 公开 slug 与路由所有权
- **默认**：所有公开 route files、canonical 和 alias 都由下游 Adapter 拥有；Foundation 只提供保留段和冲突测试工具。
- **兼容规则**：改变路径必须同时提供旧路径 alias/301、新旧 canonical 与 sitemap 回归测试；不得在上线后让一个 slug 被两条页面同时索引。
- **风险**：上游注册 `/:type`、`/:type/:slug` 或 `/:seoPageSlug` 会与现有根级动态路由、`/category`、`/ranking(s)`、营销页、认证和 API 路径发生冲突。
