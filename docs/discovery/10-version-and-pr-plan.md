# 10 — v5 Delivery Plan（交付节奏与 PR 边界）

状态：交付计划 v2（contract-first、adapter-first、schema-deferred）。

基线：EasyStarter `v0.4.10`。目标不是将 AIBranding、Prompt Dir 或 URL Next 的旧实现搬进模板，而是先在真实下游中验证一个薄 Discovery Foundation。

> 本路线图的后续阶段是非绑定提案。Phase 0.1 已完成；[Gate A / Gate B 决定](./v5-execution/05-phase0-decision-and-phase1-scope.md) 优先：治理/测试工作须先获 URL Freeze 接受，Runtime、Data 与 URL 工作仍不得开始。

---

## Phase 0 — 只读审计与 URL 冻结

- AIBranding、Prompt Dir、URL Next：公开路由、动态段、canonical、sitemap、alias、索引和页面视觉基线。
- AIBranding、Prompt Dir：D1 数据资产、身份/唯一性、发布状态、导入、不可丢字段、公开读取性能与 Context 成本。
- 输出：保留段表、URL inventory、canonical/301/sitemap parity 清单、数据资产清单和迁移阻塞项。
- 禁止：Schema、Migration、新 Foundation route、数据回填、生产切流。

## Phase 0.1 — Prompt Canonical / Sitemap Evidence Closure

- 只读构建 Prompt Dir，固定实际 sitemap、Resource Type canonical、内部链接调用点与 redirect graph。
- 输出见 [Phase 0.1 closure](./v5-execution/06-prompt-canonical-and-sitemap-closure.md)。
- 不修复 sitemap、不改下游路由；它是 Phase 0 收尾，不是功能版本或 Runtime Phase。

## Phase 1 — 候选 AIBranding 私有合同 Pilot（需 Go）

- 仅在 Go 后，在 `modules/aibranding/**` 与既有领域表之上重新评估最小私有合同和 parity fixture；不得假定现有候选接口有效。
- 不迁表、不改 URL、不改变 Offer/Inquiry/Favorite/价格/售卖状态行为。
- 验收：列表/详情读取具备验证、稳定分页、轻量公开读取路径和 canonical 生成；关键公开页面可与现状比较。

## Phase 2 — Prompt Dir 私有合同 Pilot

- 在现有直接 Hono 公共读取之上验证同一最小合同、分页和输入护栏。
- 保留 Prompt Dir 的现有 canonical、表、内容/复制/评分/筛选和路由。
- 验收：明确记录与 AIBranding 真正重复的代码，以及只是名称相同但语义不同的部分。

## Phase 3 — 差异审计与晋升 ADR

- 对每个候选能力比较输入、输出、错误语义、生命周期与测试方式。
- 只为已证明同构的能力创建 ADR；其余继续留在 Adapter。
- 预期候选：公共读取注册触点、轻量 Context 约束、List/Detail 合同、参数/分页护栏、保留段测试、SEO/缓存回归工具、Listing 壳。

## Phase 4 — 最小 Foundation PR

- 仅提取 Phase 3 批准的代码与 RED → GREEN 合同测试。
- 不包含共享 D1 Schema、通用公开 Web 路由、通用 Ranking 表、Alias 表、Admin CRUD、导入引擎、FTS 或生产数据迁移。
- 验收：Discovery 关闭时零路由/导航/sitemap 注册，普通 SaaS Profile 无回归；两个私有 Adapter 仍可独立演进。

## Phase 5 — 共享 Schema ADR（条件性）

只有当两个 Adapter 都因重复持久化模型产生明确成本时，单独审查是否需要共享 Schema。ADR 必须包含：两边字段语义、唯一性、发布生命周期、Migration、shadow read、parity、切流、回退和生产验证。未获批准则不创建 Migration。

## Phase 6 — AIBranding 生产迁移（最后）

只有 Phase 4/5 已稳定、页面与 SEO parity 通过、D1 备份与回退路径演练完成后，才可选择性迁移 AIBranding。生产迁移不是 v5 Foundation 的前置条件。

## v5.0 验收

1. AIBranding 与 Prompt Dir 已分别验证最小合同；
2. Foundation 只包含已有双下游同构证据的能力；
3. 所有产品保留自己的数据、URL、UI、筛选、排行算法、导入与商业逻辑；
4. `siteModules.discovery` 关闭时 Profile 矩阵无路由、导航和 sitemap 回归；
5. 所有后置候选都明确标为 ADR，而非隐藏实现承诺。

2026-08-10 的 Foundation 验收结论见
[Discovery v5 Foundation acceptance](./v5-execution/11-v5-foundation-acceptance.md)。
它冻结已由 Prompt Dir 与 AIBranding v5 证明的薄 Foundation；不把 URL
Next、生产切流、共享 UI 或共享数据模型误列为这个验收的前置条件。

## PR 规则

- 每个 PR 只完成一个 Phase 的一个可验证切片；合同先 RED、实现后 GREEN。
- 不与 payments、credits、jobs、auth、已应用 Migration 或生产 Worker 配置混改。
- 代码 PR 运行 `pnpm fmt:check`、`pnpm lint`、`pnpm check-types`、`pnpm test`、`pnpm check:boundaries`；文档 PR 至少运行 `git diff --check`。
