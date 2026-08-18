# 采用 Prompt P2：AIBranding 迁到新模版 + 旧后台替换（完整版）

> 目标仓库：`gt88domain/aibranding-easystarter`（本地 `/Users/linyan/dev/aibranding-next`）。
> 前置：上游 ≥ v0.11.0；《docs/migration-guide.md》存在；url-next 试点（P1）完成并复盘。
> **这是生产中的业务后台替换，风险最高的下游。** 严格按 playbook：Audit → Architecture → Schema → Migration → Feature。
> 每阶段停在 checkpoint 等所有者签字。明确排除：不使用 aibranding-v5 的任何代码。

## 背景事实（执行者须先复核，不得盲信）

- 生产版本 v0.5.4，基线 EasyStarter v0.4.0 / 90178604；治理兼容，MOD-0001~0005 有效。
- 旧后台：`/admin` → `/admin/domains` + `/admin/offers`，日常在用的业务运营后台。
- 公开读取全部走 public-read seam；生产审计表 0017 已应用（9 列 canonical + 两个索引）。
- 管理员 = `ADMIN_EMAILS` / `TEMP_ADMIN_EMAILS` 服务端 allowlist。

## 阶段 0：审计与采用决策（不改代码）

按 `docs/migration/00-audit.md` 输出，除通用审计外必须额外覆盖：

1. **采用路线决策**：in-place 升级（0.4 → 当前）vs 新模版重建 + 搬运 `modules/aibranding`。
   给出两条路线的冲突点预估、工作量对比、回退难度，交所有者签字。
2. **Domains 操作全清单**：列出旧 `/admin/domains` 的每一个读/写操作（改价、改状态、上下架等），
   标注对应的服务端函数——它们是阶段 2 的迁移对象，一个都不许丢。
3. **Offers 数据模型摸底**：offers 表全部字段、状态枚举、历史消息/往来记录的存储方式、
   在途未关闭 offer 数量。输出 Offers → Tickets 字段映射草案（见阶段 3）。
4. **公开询价写入路径**：站内询价表单当前写哪张表、经过哪个 handler——阶段 3 要改它。
5. **Tickets metadata 展示缺口决策**：上游 Tickets 的 metadata 目前是「只写不读」，
   管理端 Support 页不展示 metadata。Offers 迁入后，管理员需要在工单详情里看到域名与报价。
   决策项（二选一，签字）：
   - A. 给上游提一个小 PR：管理端工单详情以纯文本安全渲染 metadata JSON（推荐，所有下游受益）；
   - B. AIBranding 自建一个管理模块页展示工单关联的域名上下文。
6. 风险清单：生产 D1、在途询盘、公开页/SEO 零回归要求。

## 阶段 1：模版基线迁移

- 按签字路线执行；治理登记同步更新（`.template/source.json` + MOD 记录）。
- 公开站功能零回归（公开读取仍走 seam）。
- 门禁全绿；预览环境验收新通用后台。
- **Tickets capability 本阶段保持关闭**（表结构可随迁移落地，能力默认关）。

## 阶段 2：Domains 管理模块（新旧并行）

目标形态（严格按 v1.2 扩展点约定，不得偏离）：

```
apps/web/src/modules/aibranding/backoffice.ts
  → export const backoffice: BackofficeModule = {
      id: "aibranding-domains",
      adminModule: { titleKey: "...", routeId: "/admin/domains" },
    }

apps/web/src/routes/_authed/(dashboard)/admin/(modules)/domains.tsx
  → 薄路由，必须用 createAdminModuleRoute()（边界门禁会强制）

apps/web/src/modules/aibranding/...   → 页面组件（DataTable 复用现有 UI 组件）
apps/server/src/modules/aibranding/   → 服务端 router，复用现有业务函数
```

硬性要求：

- **业务逻辑零重写**：页面只换壳，改价/改状态等写操作继续调用现有服务端函数；
  业务规则、权限校验不变。
- 写操作必须经 `recordAdminAuditLog` 写审计（若现有函数已写审计，确认记录进入同一审计表）。
- **新旧 `/admin/domains` 并行运行**：新页面上线后旧页面保持可用，
  所有者对照验收（同一条域名，两边看到的数据与操作结果一致）后，旧页面才允许退役。
- 若 Domains 还需要用户侧入口（如「我关注的域名」），以 userApp 注册进 Apps 分组；
  没有需求就不做。

## 阶段 3：Offers → Tickets

原则：**Offers 不重写为独立功能，迁进 Tickets**；交易仍在第三方完成，Ticket 只承载往来记录。

1. **开启 tickets capability**（本项目配置中开启，不动上游默认值）。
2. **字段映射**（阶段 0 草案签字后定稿）：
   - offer 主记录 → `ticket`：`subject`（如「域名 + 报价摘要」）、`status`、`metadata`
   - `metadata`（JSON）建议键：`domain`、`offeredPrice`、`currency`、`source: "offers-migration"`、`originalOfferId`
   - 状态映射草案：`pending/negotiating → open`；`replied → replied`；`accepted/expired/closed → closed`
     （以阶段 0 摸清的真实状态枚举为准调整）
   - 往来记录 → `ticket_message`，按时间排序写入，`authorRole` 按发言方标 user/admin
3. **数据迁移**：放 `db/data-migrations/`，幂等、可重跑、带验证查询；
   先写验证与回退方案再执行；生产执行前导出备份。
   - 对账：行数一致 + 抽样字段比对（至少 20 条随机样本逐字段核对）
   - 幂等键：`metadata.originalOfferId`，重跑不产生重复 ticket
4. **公开询价表单改写**：提交 → 创建带 metadata 的 ticket（复用 tickets create 或专用公开端点）；
   用户侧体验保持不变；预览/测试环境不得外发邮件。
5. **metadata 展示**：按阶段 0 签字的 A/B 决策落地（推荐 A：上游工单详情安全渲染 metadata）。
6. **旧 offers 表**：保留只读观察期（建议 ≥2 周），确认新流程稳定后由所有者决定归档。

## 阶段 4：旧后台退役

- 所有者验收通过后：删除旧 `/admin` 页面与路由，`/admin` 指向新后台。
- `TEMP_ADMIN_EMAILS` 等临时机制由所有者决定保留或清理。
- 生产发布、公告、观察期；回退预案就绪。

## 红线

- 任何阶段不得中断在途业务：域名询盘必须始终可提交、可处理。
- 数据迁移必须有回退方案；生产 D1 操作前必须导出备份。
- 审计表形状与索引不得被破坏；新写操作必须继续写审计。
- 不做 Central 相关改动；不引入 v5 代码。
- 每阶段输出：改动摘要、测试结果、数据对账结果（如涉及）、与计划的偏差。

## 完成定义

- [ ] `/admin/domains` 以管理模块运行，新旧对照验收通过
- [ ] Offers 全量迁入 Tickets，对账零差异，公开询价改写完成
- [ ] 旧 `/admin` 退役，业务零中断
- [ ] 治理登记与审计完整性无回归
