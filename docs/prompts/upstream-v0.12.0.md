# 上游 v0.12.0 执行 Prompt：Tickets metadata 渲染 + 下游开启通道

> 仓库：`/Users/linyan/dev/tanstack`（模版上游）。独立分支实施，停在未提交状态。
> 背景：AIBranding 采用决策已签字（②选 A）。本包是下游 Offers→Tickets 迁移的前置。
> 原则：两个改动都小、向后兼容、默认行为不变。

## 改动 1：管理端工单详情渲染 metadata

- 位置：`/admin/support` 工单详情页。
- 行为：ticket 有 metadata 时，以**纯文本键值对**渲染（嵌套 JSON 可缩进展示）；
  无 metadata 时不显示该区块。
- 安全红线：禁止 `dangerouslySetInnerHTML`；所有值按字符串渲染；
  键与值长度、对象最大深度、每层最大条目数都做上限截断（防超长或深层垃圾数据撑爆页面）。
- metadata 需要加入管理端 ticket detail 的输出 schema（仅管理端；用户侧输出不变）。
- 测试：metadata 渲染、XSS 向量（`<script>`、`<img onerror=...>`）原样作为文本、
  无 metadata 无区块、超深/超大 metadata 被安全截断。

## 改动 2：下游开启 Tickets 的干净通道

现状问题：官方 profile 全部 `tickets: false`；浏览器可见性经 `publicRuntime.features.tickets`
取自 profile，导致下游仅靠 product-config 开启时服务端与浏览器显隐可能不一致。

要求：

- 让 `tickets` 成为**产品自有组合项**：下游显式开启后，服务端能力与管理/用户两侧显隐
  保持一致（浏览器可见性与服务端能力同源）。
- 上游四个官方 profile 保持 `tickets: false` 不变；上游默认行为零变化。
- 新增或复用一个**浏览器安全、仅含 capability boolean 的 product-owned 子入口**，作为
  Tickets 覆盖值的唯一来源；public runtime 和 server 的 `common.features.tickets` 都从它派生。
  该入口不得包含邮件、域名、支付商、价格、密钥或任何服务端产品配置。
- 禁止 Web 从 `@repo/app-config` 根 barrel 或完整 `product-config.ts` 导入该覆盖值；
  禁止为了此能力放宽 `check-public-config-leaks`。
- 更新 `resolveBackofficeVisibility` / public runtime 的取值链路，保证单一事实来源。
- 测试：profile 默认关闭（现状回归）+ 模拟下游开启后双端一致出现。
- 同步更新 `docs/backoffice-modules.md` 与 `docs/migration-guide.md` 的 tickets 说明。

## 门槛

- `pnpm test`、`check-types`、`lint`、`fmt:check`、`perf:budget`、`check:boundaries` 全绿。
- 四 profile 构建全绿。
- Conventional Commits；release-please 自然发版（预计 v0.12.0）。

## 明确不做

- 不改 Tickets 业务逻辑、状态机、审计。
- 不做 metadata 的类型化字段系统（仍是自由 JSON，渲染通用键值对）。
- 不动 Central 与下游仓库。

## 完成定义

- [ ] 管理端工单详情可见 metadata，XSS 安全
- [ ] 下游开启 Tickets 双端一致，上游默认零变化
- [ ] 文档同步；全部门禁绿；停在未提交状态
