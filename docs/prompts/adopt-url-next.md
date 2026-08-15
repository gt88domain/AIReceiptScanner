# 采用 Prompt P1：url-next 迁到新模版（试点）

> 目标仓库：`gt88domain/url-next`（本地 `/Users/linyan/dev/url-next`）。
> 前置：上游模版 ≥ v0.11.0 已发布；《docs/migration-guide.md》已存在。
> 这是第一个下游采用试点，为后续项目趟出可复用流程。每阶段完成停在 checkpoint，等所有者确认再进下一阶段。
> 注意：该仓库有进行中的 D1 升级验证分支，开始前先确认不与之冲突。

## 阶段 0：审计（只做调查和计划，不改代码）

按 `docs/migration/00-audit.md` 规范输出审计报告：

- 当前基线版本、与上游的受保护差异清单
- 旧后台（/admin 及相关页面）现有功能清单——预期基本为空，如实记录
- 业务功能清单（报价、提交、审核等）与其数据表
- 需要的 capabilities：本项目是否有支付（pay2submit 等）、是否需要 tickets
- 进行中的分支/工作区冲突评估（D1 升级验证）
- 产出：采用路径决策（in-place 升级 vs 新模版重建+搬运）与分阶段计划，交所有者签字

## 阶段 1：基线迁移

- 按阶段 0 签字的路线执行；遵守治理流程（.template/source.json、MOD 登记）
- 门禁全绿：pnpm test / check-types / lint / fmt:check / check:boundaries
- 本地 preview 验收：常驻 Admin 页面可打开、权限正确；Payments / Support 仅在审计后启用对应 capability 时验收

## 阶段 2：后台切换

- 新后台先与旧 `/admin` 并行或经兼容重定向就位；删除/退役旧页面只能在阶段 3 所有者验收后进行
- 按审计结论开启 capabilities
- 若有业务功能适合做成模块（如报价管理），按 backoffice-modules.md 注册——本阶段只做已在审计中确认的，不新增需求

## 阶段 3：验收与切流

- 预览环境完整验收（所有者执行）
- 生产部署按仓库部署安全规范（production safety preflight）
- 旧后台 URL 处理：保留重定向或下线，按所有者决定

## 红线

- 不动生产数据的写操作不在本 prompt 范围（除非阶段 0 审计明确列出并附回退方案）
- 不使用 aibranding-v5 的任何代码
- 每阶段输出：改动摘要、测试结果、与计划的偏差
