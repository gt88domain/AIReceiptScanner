# 11 — v5 Test & Acceptance Plan（测试与验收）

状态：提案 v2（contract-first、adapter-first）。

## Phase 0 evidence tests

- 从 route tree 生成或核对每个产品的 URL inventory、动态段、保留段、canonical、sitemap 与页面所有者。
- 对 AIBranding、Prompt Dir 的既有公开页面建立视觉/HTML、状态码、canonical、robots、sitemap 和关键列表/详情数据基线。
- 审计 D1 资产：主键、slug、发布状态、不可丢数据、导入来源和公开读取 Context 成本；只读，不迁移。

## Private Adapter tests

- `validateListQuery` 拒绝非法格式、超长 query、超页码、未声明排序和过多多值参数。
- `list` 使用稳定分页，不累计读取前页；`detail` 对不可见内容返回不泄露状态的结果。
- 公开读取桩断言不初始化 Auth、Payments、Credits、Storage 或 Admin Context。
- `buildCanonicalUrl` 与当前产品 canonical、路由和 sitemap 一致。
- AIBranding 和 Prompt Dir 各自使用自己的真实 fixture；不要求相同字段、Facet、Ranking 或 Schema。

## Foundation promotion tests

只有一个能力在两个 Adapter 的输入、输出、错误语义、生命周期和测试方式都同构时，才先提交 RED 合同测试，再提取最小上游实现。每次晋升必须证明：关闭 Discovery 时没有新增路由、导航、sitemap 输入或 Profile 回归。

## 后置测试

共享 Schema、Migration、Query AST、Cursor、facet counts、Alias、Rank、Admin、Import、FTS、JSON-LD 与公开统一 API 只在相应 ADR 获批后新增其专属测试。不得把候选能力伪装成 v5 默认验收。

## 通用闸门

代码 PR 运行 `pnpm fmt:check`、`pnpm lint`、`pnpm check-types`、`pnpm test`、`pnpm check:boundaries`；文档 PR 运行 `git diff --check`。生产迁移额外遵循 `docs/production-migrations.md`，并需要 shadow read、parity、备份、切流与回退演练。
