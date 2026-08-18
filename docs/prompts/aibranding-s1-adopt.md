# AIBranding Stage 1：in-place 基线升级执行包

> 目标仓库：`gt88domain/aibranding-easystarter`。
> 前置：S0 审计已完成并签字（`docs/migration/aibranding-v012/00-audit.md`）；上游 v0.12.0 已发布（tag `02306a7`）。
> 总纲：`docs/prompts/adopt-aibranding.md`；流程参照 url-next 试点（其 retrospective 是已知坑清单）。
> 本阶段完成后**停在「merge 已解决、尚未 commit」状态**，等审查 + 所有者验收。

## 已签字结论（约束，不得重新讨论）

- 路线：in-place。S0 预演 45 个冲突，全落在上游共享运行时/配置/测试/治理文件，**无一落在产品模块**。
- 目标基线：上游 **v0.12.0**（不是 v0.11.0）。
- profile：`directory-lite` + Tickets 开启（走 v0.12.0 的 `productFeatureOverrides`，不改官方 profile）。
- billing / credits / jobs / storage 保持关闭（会员/积分是未来项目，届时切 profile）。
- Offers/询价 **不做数据迁移**：`domain_inquiries`（offers）保留为专有模块，表原地不动。
- 旧 `/admin`（domains/offers）保留为受守卫的可用入口，Stage 2 新旧并行验收后才谈退役。

## 前置门（全部满足才开工）

1. **干净工作区**：从 AIBranding `origin/main@0b5cce3`（v0.5.4）新建 worktree 与采用分支。
   主工作区任何未提交改动不带入。
2. **playbook 决策落盘**：参照 url-next 的 `url-next-v011/` 五件套，写
   `docs/migration/aibranding-v012/01-data-owner.md` ~ `05-cutover.md` 并先行 commit。
   特别覆盖：S0 账本结论（0000–0017 与仓库一致、无 archived 迁移）；Tickets 归属；
   domain_inquiries 保持专有模块；禁用能力 fail-closed。

## 实施步骤

### 1. 合并上游 v0.12.0

- `git remote` 指向模版仓库，fetch tags，`git merge --no-ff v0.12.0`（或等效）。
- 先跑 `pnpm template:upgrade-check --from v0.4.0 --to v0.12.0`；停止信号即停。

### 2. 分组解决 45 个冲突

- 按 S0 分布分组：共享运行时 / 配置 / 测试 / 治理文件。
- **产品模块零让步**：`modules/aibranding`、公开目录 seam、审计相关代码以 AIBranding 侧为准。
- 每条冲突解决留痕迹（commit 后 diff 可审）；禁止为省事删产品代码。

### 3. 产品配置固定

- `product-config.ts`：AIBranding 身份（站名、域名、发件邮箱 `mail.aibranding.com`）、
  `jobs: false`、`productFeatureOverrides = { tickets: true }`。
- wrangler：无 Queue/DLQ/Cron/R2 绑定；secrets 仅所需项；`ADMIN_EMAILS` 保留。
- `EASYSTARTER_PROFILE_BUILD=directory-lite` 注入位置正确（web 与 server 两侧）。
- 已启用能力复查：Tickets 双端可见；Billing/Credits/Jobs/Storage 页面不显、资源不初始化。

### 4. 迁移编号纪律

- 生产账本 0000–0017 封存不可变；上游带来的新结构迁移**重映射为下游 0018 起**的新文件，
  journal 正确接续；fresh 本地 D1 从零复现 + 二次执行无 pending。
- 参考 url-next 做法：迁移内容幂等化预案要写明（虽然本次无 archived 迁移，仍要给出
  生产应用前的只读 `PRAGMA table_info` 预检清单）。

### 5. 性能门禁适配（预期会遇到）

- 按 url-next 模式：上游预算文件不动，AIBranding 自己的 `performance-budget.json`
  = 实测基线 + 5% 余量 + 精确字体 allowlist；查 repository-facts 确认治理归属。

## 门禁（全绿才停 checkpoint）

- `pnpm test` / `check-types` / `lint` / `fmt:check` / `build` / `check:boundaries`
- `profiles:build -- --profile=directory-lite`、`perf:budget`、OSV、wrangler 类型检查
- 迁移本地重放、`git diff --check`

## 红线

- 不写生产 D1、不部署、不动 `domain_inquiries` 数据、不删除旧后台。
- `.template/source.json` 等 merge commit 创建后再更新到 v0.12.0（祖先检查要求）。
- 发现冲突落在产品模块或账本与 S0 结论不符 → 停下报告。

## 自检报告（checkpoint 时输出）

冲突解决分布、迁移映射表、产品配置 diff 摘要、预算基线、门禁输出、与计划的偏差。
