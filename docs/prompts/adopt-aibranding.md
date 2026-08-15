# 采用 Prompt P2：AIBranding 迁到新模版 + 旧后台替换

> 目标仓库：`gt88domain/aibranding-easystarter`（本地 `/Users/linyan/dev/aibranding-next`）。
> 前置：上游模版 ≥ v0.11.0；《docs/migration-guide.md》存在；url-next 试点（P1）已完成并复盘。
> **这是生产中的业务后台替换，风险最高的一个下游。** 严格遵守仓库 migration playbook：
> Audit → Architecture → Schema → Migration → Feature。每阶段停在 checkpoint 等所有者签字。
> 明确排除：不使用 aibranding-v5 的任何代码。

## 背景事实（执行者须先自行复核，不得盲信）

- 生产版本 v0.5.4，基线 EasyStarter v0.4.0 / 90178604；治理兼容，MOD-0001~0005 有效。
- 旧后台：/admin → /admin/domains、/admin/offers，是日常在用的业务运营后台。
- 公开读取全部走 public-read seam；生产审计表 0017 已应用（9 列 canonical）。
- 管理员 = ADMIN_EMAILS / TEMP_ADMIN_EMAILS 服务端 allowlist。

## 阶段 0：审计与采用决策（不改代码）

按 `docs/migration/00-audit.md` 输出：

- 上游基线差异与 5 份 MOD manifest 的处置方案
- **采用路线决策**：in-place 升级（0.4 → 当前）vs 新模版重建 + 搬运 modules/aibranding 产品代码。
  必须给出两条路线的冲突点预估、工作量对比、回退难度，交所有者签字。
- 旧后台功能清单：Domains 全部操作、Offers 全部操作、公开询价表单的写入路径
- Offers → Tickets 的数据模型映射：现有 offers 表字段 → ticket + ticket_message + metadata(JSON) 的对应关系草案
- 风险清单：生产 D1、在途询盘、SEO/公开页不受影响的要求

## 阶段 1：模版基线迁移

- 按签字路线执行；治理登记同步更新
- 公开站功能零回归（公开读取仍走 seam）
- 门禁全绿；预览环境验收新通用后台

## 阶段 2：Domains 管理模块（新旧并行）

- 用 v1.2 扩展点实现 Domains 管理模块：`modules/aibranding/backoffice.ts` 注册 adminModule；
  薄路由文件走 `createAdminModuleRoute()`；服务端业务逻辑复用现有 modules/aibranding，不改业务规则
- **新旧 /admin/domains 并行运行**，旧页面保持可用直到所有者验收新页面
- 域名写操作（改价/改状态）继续走现有服务端逻辑，并确认审计记录完整

## 阶段 3：Offers → Tickets 数据迁移

- 结构迁移（ticket 表已在上游 0021，确认下游应用）+ 数据迁移（offers → tickets，域名/报价进 metadata）分离
- 迁移验证方法（行数对账、抽样字段比对）与回退方案必须先写再执行
- 公开询价表单改写为创建 ticket（带 metadata），用户侧入口保持不变
- 旧 offers 表保留只读一段时间，确认无误后再按所有者决定归档

## 阶段 4：旧后台退役

- 所有者验收通过后：删除旧 /admin 页面，/admin 指向新后台
- TEMP_ADMIN_EMAILS 等临时机制按所有者决定保留或清理
- 生产发布、发布公告、观察期

## 红线

- 任何阶段不得中断在途业务（域名询盘必须始终可提交、可处理）
- 数据迁移必须有回退方案；生产 D1 操作前必须有备份/导出
- 审计表形状与索引不得被破坏
- 不引入 Central 相关改动
- 每阶段输出：改动摘要、测试结果、数据对账结果（如涉及）、与计划的偏差
