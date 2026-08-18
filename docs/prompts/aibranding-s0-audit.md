# AIBranding Stage 0：审计与采用决策（只读，不改代码）

> 目标仓库：`gt88domain/aibranding-easystarter`（本地 `/Users/linyan/dev/aibranding-next`）。
> 总纲：`docs/prompts/adopt-aibranding.md`。本 prompt 只执行其中阶段 0。
> **本阶段只读：不改代码、不写生产 D1、不动部署。**
> 参考输入：url-next 试点复盘（`url-next/docs/migration/url-next-v011/06-retrospective.md`）。

## 所有者已预签的三个决策（2026-08-16）

审计的任务是**验证**这些决策的前提成立，而不是重新讨论；若验证不通过，停下报告：

1. **路线：in-place 升级**（0.4 → 目标 tag）。验证项：无提交合并预演的冲突规模应与
   url-next 同量级（约 35 个）；若灾难性更大（数百个或集中在产品代码），立即上报重新评估。
2. **metadata 展示：选 A**（上游渲染）。上游 v0.12.0 包将先落地，**AIBranding 的目标基线
   因此是上游 v0.12.0（或更新），不是 v0.11.0**。
3. **目标 profile：`directory-lite` + Tickets 开启**。验证项：开启通道依赖上游 v0.12.0 的
   改动 2；确认审计时上游该版本已发布。

**未来能力备忘（写进审计报告，防止以后误判）**：AIBranding 规划做会员订阅与积分。
本次迁移不启用 billing/credits/jobs/storage；相关表随迁移链保留。未来该功能立项时，
再进行 profile 切换 + 支付商/webhook/Queue 配置——那是一次配置变更，不是再次迁移。

## 背景事实（先自行复核，不得盲信）

- 生产 v0.5.4，基线 EasyStarter v0.4.0 / 90178604；MOD-0001~0005 有效；治理兼容。
- 旧后台：`/admin` → `/admin/domains` + `/admin/offers`，日常在用。
- 审计表 0017 已应用（9 列 canonical + 两索引）；公开读取走 public-read seam。
- 管理员 = `ADMIN_EMAILS` / `TEMP_ADMIN_EMAILS` 服务端 allowlist。
- 明确排除 aibranding-v5。

## 审计任务（按序完成）

### A. 工作区与账本核实（只读）

1. 本地主工作区是否干净、是否与 origin/main 同步（url-next 教训：落后且脏的工作区不能用作基线）。
2. **只读**核实生产 D1 迁移账本：已应用编号列表、是否存在「archived 迁移」
   （生产账本有、仓库文件没有，如 url-next 的 0020）。所有查询只读，报告 `rows_written: 0`。
3. 确认 v0.4.0（90178604）是当前历史祖先。

### B. in-place 预演验证（对应预签决策 1）

- 无提交合并预演（完成后完全撤销）：统计真实冲突数量与分布。
- 输出冲突分布报告；量级判断标准见预签决策 1。

### C. Domains 操作全清单

- 列出旧 `/admin/domains` 的**每一个**读/写操作（改价、改状态、上下架、搜索、筛选、批量操作等），
  标注对应服务端函数与是否写审计。一个都不许丢——这是阶段 2 新旧对照验收的基准。

### D. Offers 数据模型摸底

- offers 表全部字段、状态枚举真实值、往来消息存储方式、在途未关闭 offer 数量、关联 FK。
- 输出 Offers → Tickets 字段映射**草案**：主记录 → ticket；状态映射；往来 → ticket_message；
  metadata JSON 键设计（`domain` / `offeredPrice` / `currency` / `originalOfferId` / …）。
- 公开询价表单的写入路径（写哪张表、过哪个 handler）。

### E. 能力清单核对（对应预签决策 3）

- 逐项确认启停：billing ✗、credits ✗、jobs ✗、storage ✗、tickets ✓、email 按现状。
- 若审计发现任何已在用的计费/积分路径（与背景事实矛盾），立即停下报告。

### F. 风险清单

- 生产 D1 操作风险点、在途询盘连续性、公开页/SEO 零回归要求、部署回退路径。

## 交付物

1. `docs/migration/aibranding-v011/00-audit.md`（按 playbook 格式；目录名可按实际目标版本调整）
2. 三个预签决策的验证结论（通过 / 不通过 + 证据）
3. Domains 操作清单、Offers→Tickets 映射草案、能力清单、冲突预演统计
4. 未来会员/积分的 profile 切换备忘

## 停止条件

- 任何与背景事实或预签决策前提不符的发现 → 停下报告。
- 本阶段结束标志：所有者确认验证结论后签字进入 Stage 1。
