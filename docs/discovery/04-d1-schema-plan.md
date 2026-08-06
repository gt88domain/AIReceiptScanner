# 04 — Deferred Schema Candidate（延后 Schema 候选）

状态：Deferred candidate，非实施计划。

不在 v5 Phase 0–4 创建 `apps/server/src/db/schema/discovery.ts`、Foundation Migration 或共享 D1 表。AIBranding 和 Prompt Dir 各自继续拥有当前领域表；旧 D1 是受保护的迁移源，而不是可以清空或原地实验的对象。

---

## 1. 现在应做的数据审计

每个下游先输出以下资产清单，不能预设“旧表 → 新 Discovery 表”的映射：

- 表、主键、外键/逻辑关联、外部 ID 与唯一约束；
- slug、历史 URL、canonical、sitemap、发布状态和不可见状态；
- 导入来源、人工编辑归属、不可丢数据、附件与商业记录；
- 读取量、公开读取的 Context 成本、分页和缓存行为；
- 迁移阻塞项、可比对字段和可回退边界。

AIBranding 的 `public_domains`、`public_domain_categories`、`public_brand_ideas`、模板表、`domain_inquiries`、`domain_daily_views` 与 Prompt Dir 的 `discovery_document`、`discovery_resource`、taxonomy/junction、collection/source/link 均先按原语义保留。

## 2. 候选共享模型（仅供未来 ADR）

此前讨论的 Item、Category、Tag、Taxonomy、Source、ItemSource、Import Document、Alias、Relation、Collection 和 Ranking 表可以保留为研究素材，但没有任何一张是当前 Foundation 的默认表。

要提出共享 Schema ADR，必须同时证明：

1. 两个 Adapter 的持久化形状相同，且不靠大量 nullable 字段或 JSON 才能覆盖；
2. 同一套身份、唯一性、发布和回填规则能保留两边现有语义；
3. 共享表确实比两个私有读取 Adapter 降低维护成本；
4. 有 migration、shadow read、parity、切流、回退和生产验证计划。

在这些证据具备前，不分配 Migration A/B/C，不预占编号，不把候选索引、SQL 或表数列为验收项。

## 3. 未来迁移的不变规则

- 结构迁移、数据回填、seed、repair 分离，遵守 `apps/server/src/db/README.md`。
- 已应用 Migration 不可改；生产数据变更有备份、验证和 forward-fix 方案。
- 生产切流最后进行；先完成字段语义、URL、SEO 与页面 parity，再决定写入路径。
