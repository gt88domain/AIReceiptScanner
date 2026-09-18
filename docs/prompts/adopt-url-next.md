# 采用 Prompt P1：url-next 迁到新模版（试点）——Stage 0 已签字版

> 目标仓库：`gt88domain/url-next`（本地工作区另建，见前置门 1）。
> Stage 0 审计已完成并由所有者签字（2026-08-15）。本文件现在是 Stage 1+ 的执行依据。

## Stage 0 已签字的结论（约束，不得重新讨论）

- **路线：原地升级（in-place adoption）**。依据：EasyStarter v0.4.0（90178604）是当前历史祖先；
  D1 迁移链 0000–0019 连续且可复现；目录业务已隔离在 `apps/server/src/modules/directory/` 与
  `apps/web/src/modules/directory/`。禁止重建+搬运。
- **候选基线：`origin/main@79ac6e1`（下游自身 v0.5.2）**，不是本地旧主工作区（落后 18 提交且脏）。
- **Defer 清单（本次一律不做）**：支付、积分、Jobs、审计增强、Storage 上传、Tickets。
- **非迁移对象**（审计确认无代码/无表，禁止顺带发明）：报价、付费提交、审核 / pay2submit。
- **Preserve**：公开目录/SEO/博客/集合/标签/站点地图；D1 读模型与迁移历史；浏览器 localStorage
  收藏（不搬 D1）；Contact / Newsletter 作为独立外部动作（**不得误当 Ticket**）；Chrome 扩展（独立产品）。
- **Replace**：账号/Profile/Security → 上游现有实现（保留用户数据结果）；现有 /admin 单页 →
  新后台，但**先并行/兼容重定向，Stage 3 验收后才允许退役**。

## Stage 1 前置门（全部满足才允许开工）

1. **干净工作区**：从 `origin/main@79ac6e1` 新建 worktree 与采用分支。
   现有脏主工作区禁止使用；其中未跟踪的 `.production-safety` 含生产安全配置——
   **不带入新工作区、不提交**，留待部署阶段按安全预检流程处理。
2. **playbook 前置决策**：完成 `01-data-owner` 与 `04-security-check` 的关键决策，特别是：
   D1 迁移编号接续方案（上游已占用哪些编号 vs 下游 0000–0019）；
   已禁用的 Jobs / Audit / Assets 在上游恢复后的冲突处置。
3. **遗留发件域名**：产品配置中的旧 AIBranding 发件身份需要纠正为 Urls.ai 身份——
   这是配置纠正任务，列入计划，**本阶段不执行**，单独提交。

## Stage 1：基线升级（参考 docs/migration-guide.md 的 in-place 流程）

- 消费上游发布 tag（≥ v0.11.0），先跑 `pnpm template:upgrade-check --from v0.4.0 --to <tag>`；停止信号即停。
- 治理登记：`.template/source.json` 基线更新 + 受保护差异 MOD 登记。
- 门禁全绿：`pnpm test` / `check-types` / `lint` / `fmt:check` / `check:boundaries`。
- 预览验收：`pnpm preview:backoffice` 打开新后台核心页，确认权限与显隐。

## Stage 2：后台切换（并行期）

- 新后台就位；旧 `/admin` 保持可用或兼容重定向，**本阶段禁止删除**。
- 按 Defer 清单，所有支付/积分/Jobs/Tickets 相关能力保持关闭，页面应自动隐藏——验收时核对。

## Stage 3：验收与切流

- 所有者预览完整验收（新旧对照）。
- 生产部署走仓库安全预检；旧后台 URL 重定向或下线由所有者决定。

## 红线

- 不写生产数据；不动 D1 迁移历史；不使用 aibranding-v5 代码。
- 任何与 Stage 0 结论冲突的发现：停下来报告，不擅自扩大范围。
- 每阶段输出：改动摘要、测试结果、与计划的偏差。
