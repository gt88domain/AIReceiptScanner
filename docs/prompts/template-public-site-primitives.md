# 执行 Prompt:模版公开页原语落地(Public-Site Primitives)—— 从 spike 提取,分 PR 进主线

> 目标:把目录 spike 中**已验收的公共站点原语**以干净 PR 序列合入 `gt88domain/easystarter-template` main,
> 使下游项目(html5game / answer / generator / novel)能用统一组件搭建 /games、/answers、/tools 等公开页。
> 规格权威(优先级从高到低):
> 1. 本文件(执行范围、顺序、门禁);
> 2. `docs/candidates/public-site-primitives-from-directory-spike.md`(留/弃清单与契约说明,只读);
> 3. spike worktree `/Users/linyan/dev/v5-worktrees/easystarter-directory-layout-spike`(代码提取源,只读引用)。
> 冲突时以本文件为准,并在 PR 描述中记录偏差。

## 已验证现状(2026-08-22,不要相信旧文档里的发布状态)

- `origin/main` = **v2.0.1**(tag 已发布,含 #91 内容面 SEO 修复 + #93 fumadocs 类型生成修复)。
- CI 全绿;Release Please + auto-merge 链路已验证可用。此前两次 Release Please 失败是账户欠费,已解决。
- `check-types` 现已自给自足(#93):web 包先跑 `fumadocs-mdx` 生成 `.source` 再 `tsc -b`,全新克隆/新 worktree 不再炸。
- **以下资产不在 main,只存在于 spike worktree 的未提交改动中**:语义 skin token、listing 原语、
  PublicDetailLayout、Prose、dev-only 画廊、devtools 端口修复。

## Worktree 盘点(开工前先看,别迷路)

| 路径 | 用途 | 处置 |
|---|---|---|
| `/Users/linyan/dev/tanstack` | 主工作区;有所有者未提交的 prompts 草稿 | **禁止混入本任务的改动** |
| `v5-worktrees/easystarter-directory-layout-spike` | 代码提取源 | 只读;**永不合并其分支** |
| `v5-worktrees/easystarter-workers-preview-environment` | Cloudflare 预览环境专用 | 本任务禁用 |
| `v5-worktrees/easystarter-ci-static-types` | #93 已合并 | 可删 |
| 其余 15 个旧 worktree(phase1a-d、nanoid、v012-tickets 等) | 历史遗留 | 不在本任务范围;清理需所有者逐条确认 |

## 执行序列(每个 PR 一条干净 worktree,基线 = 最新 origin/main)

### PR1:语义 token 契约(地基,必须先落)

组件和画廊在视觉上都依赖 token,所以 token 先行。候选文档把 skin 排在第三是"谨慎"不是"依赖";
只要验收做到位,先落 token 风险最低(纯新增 CSS 变量,不改任何现有值)。

- 提取:spike 的 `apps/web/src/styles/skins/*.css`(3 个新文件,整拷);
  `apps/web/src/styles/index.css` 中**新增**的语义 token 块(surface/ink/line/skin-accent/radius/shadow/
  `--header-height`/`--page-top-offset`)——**只挑新增 hunk,禁止改动 main 现有 token 值**。
- 验收:① 现有页面(landing/dashboard/auth)像素级无变化;② PR 描述必须写明
  `--header-height: 4rem` 首次定义会使 dashboard site-header 从 auto 变固定高度(既有行为变更);
  ③ token 版本规则写进 PR 描述:新增 `--skin-*` = minor,改名/删除 = major。
- 门禁:fmt / check-types / lint / `pnpm --filter web build` / `pnpm test:content-surface` 全绿。

### PR2:SEO 导航件 + devtools 端口修复

- 提取:spike 的 `components/listing/listing-pagination.tsx`(整拷);
  `utils/seo.ts` 中新增的 `buildBreadcrumbListJsonLd` hunk(不是整文件);
  `vite.config.ts` 中 devtools `eventBusConfig` hunk(`TANSTACK_DEVTOOLS_BUS_PORT`,默认 42069)。
- 新写:`getPageNumbers` 与 breadcrumb JSON-LD 的最小单测(少于 2 项不输出、URL/label 原样透传)。
- 验收:不产生任何新路由;routeTree/sitemap 无变化。
- 门禁同 PR1。

### PR3:目录/详情/阅读原语 + adapter 契约

- 提取(整拷):spike 的 `components/listing/` 全部(15 文件 + `pages/` 子目录,**除** pagination 已在 PR2)、
  `components/public/public-detail-layout.tsx`、`components/content/prose.tsx`、
  `docs/golden-paths/directory.md`。
- **禁止**:spike 的 `components/public-site/`(header/footer/marketing 实验,已淘汰)、
  spike 对 i18n messages 的 +57 行改动(多半属于已淘汰的 public-site;原语文案一律 props 传入,
  落地后若组件引用不存在的 i18n key 说明提取有误)。
- `directory.md` 必须改写成与落地后 API 一致:删除一切 `template-preview` 引用,补 adapter 契约
  (产品提供 labels/query/URL state/数据/分类/排序规则;组件只管展示)。
- 验收:不产生 `/domains`、`/rankings`、详情等任何默认路由;sitemap 断言绿。

### PR4:dev-only 组件画廊

- 提取:spike 的 `components/design-system/gallery.tsx`、
  `routes/_public/(marketing)/design-system.tsx`(整拷);
  `vite.config.ts` 的 `nonPublicPrefixes` 加 `/design-system` hunk;
  `scripts/check-content-surface.mjs` 的 design-system sitemap 断言 hunk。
- 验收:① 生产构建访问 /design-system 返回 404;② sitemap 断言绿;③ 画廊为独立 lazy chunk;
  ④ routeTree 含 design-system 属预期(运行时 404 方案),不要对 routeTree 加断言。

### PR5:check-brand-safety 扫描(新写,无 spike 来源)

- 新脚本 `scripts/check-brand-safety.mjs`:扫描 `components/listing|public|content` 禁止裸 hex/颜色类名
  (skin 值只能在 `styles/skins/*.css`);扫描公开面品牌残留("TanStack Template"、"demo.aiarticles.com"、
  Tailark 文案);挂进 `pnpm test:content-surface` 或独立 gate。
- 顺带处理已知残留:`packages/app-config/src/public-runtime.ts` 的 `appName`/`supportEmail` 占位
  (单独小 commit,不在本 PR 改行为)。

## 执行规则(违反即打回)

1. 每个 PR 一条新 worktree,基线 `origin/main` 最新;禁止复用 spike/ci-static-types worktree 施工。
2. 对 spike 中**修改过的**文件(index.css、seo.ts、vite.config.ts、check-content-surface.mjs)只提取
   相关 hunk;新文件才可整拷。
3. 永不合并 spike 分支;永不恢复泛化 Landing、Header/Footer 重设计、假数据、默认目录路由。
4. Conventional Commits;PR 描述写清提取来源、偏差、行为变更。
5. 主工作区有所有者的未提交草稿,本任务一律不碰。
6. CI 必须真绿;若 Actions 再欠费暂停,先通知所有者,不要绕过门禁。
7. 开 PR 后**禁止启用 auto-merge**;等待验收方 review 通过并确认 CI 真绿后,由验收方合并。

## 完成定义

- 5 个 PR 全部合入 main 且 Release Please 正常滚版;
- 全新克隆 + `pnpm install && pnpm check-types && pnpm --filter web build` 一把过;
- 下游可按 `docs/golden-paths/directory.md` 在 30 分钟内搭出一个带筛选/分页/详情的公开目录页。
