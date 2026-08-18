# 恢复 Prompt:fumadocs 内容能力(docs/blog)以「零示例内容」形态回归

> 背景:v1.x 清理(未提交的工作区改动)把 fumadocs 整套基础设施(依赖、/docs 路由、
> /blog 路由、orama 搜索、source.config)连同示例内容一起删除了。示例内容该删,
> 但 docs/blog 是产品需要的内容发布能力,需要以**零示例内容、开关可控**的形态恢复。
> 所有被删文件仍在 git HEAD(v1.0.0+)中,恢复 = 选择性 `git checkout`,不是重写。
>
> 多语言系统(packages/i18n、en/zh/jp、LocaleSwitcher)从未被删,无需恢复。

## Stage 0 决策(预填,所有者可改)

- **恢复范围**:docs(文档中心)+ blog(文章/SEO 内容)。两者同为 fumadocs-mdx collection,
  一次恢复;landing-composer **不恢复**(已决策淘汰);示例 MDX(24 篇 docs、react-* 营销文、
  示例 author/category)**一律不恢复**。
- **形态**:模版级可选能力。feature flag 控制(默认**关**):导航/页脚链接、sitemap 收录、
  搜索入口全部由 flag 门控;路由本身保留,空集合时渲染空态(不 404,不报错)。
  产品在 `product-config.ts` 打开 flag 并填充自有内容后即上线。
- **内容红线**:模版仓库 `content/` 下只允许留 `meta.json`/目录骨架与 README 说明,
  不允许出现任何示例文章。产品是 AI 自动分发模式,内容一律来自产品侧。
- **与 checklist 的关系**:恢复后修订 `docs/new-project-checklist.md` 的表述——
  「docs/blog 能力在模版中默认关闭;启用 = 开 flag + 填内容 + 路由级验收」。

## 前置门

1. 当前未提交清理已通过全部门禁(已验证:check-types/lint/fmt/test/build 全绿)。
2. 选择提交策略(二选一,推荐 A):
   - **A. 先提交清理,再单独 PR 恢复**:清理按原计划提交(v1.1.0),恢复能力作为独立 PR(v1.2.0)。
     历史最清晰,回滚粒度好。
   - **B. 塑形后一次提交**:先执行本计划 Stage 1–2,再把「删示例内容 + 能力开关化」作为一个 PR。
     提交更短,但 diff 语义混杂。
3. 执行前 `git status` 确认工作区只有预期的清理改动与 docs/prompts 草稿。

## Stage 1:选择性恢复基础设施

### 执行 Prompt

```text
在 easystarter-template 仓库工作。目标:从 git HEAD 恢复 fumadocs 基础设施,
不恢复任何示例内容。HEAD 是 v1.0.0 之后,包含完整 fumadocs 实现。

1. 恢复依赖与构建管线:
   git checkout HEAD -- apps/web/source.config.ts apps/web/scripts/validate-blog-content.mjs
   手工恢复 apps/web/package.json 中依赖(版本以 git show HEAD:apps/web/package.json 为准):
   fumadocs-core、fumadocs-mdx、fumadocs-ui、@orama/tokenizers、@types/mdx,
   以及 scripts.blog:validate。pnpm install 更新 lockfile。
   vite.config.ts、tsconfig.json、performance-budget.json 中与 fumadocs/source 相关的
   配置参照 git show HEAD:<path> 恢复(注意保留清理后的其它改动,diff 逐行核对,禁止整文件覆盖)。

2. 恢复运行时文件:
   git checkout HEAD -- apps/web/src/lib/source.ts apps/web/src/lib/blog-source.ts \
     apps/web/src/lib/fumadocs-i18n.ts apps/web/src/lib/layout.shared.tsx \
     apps/web/src/styles/docs.css \
     apps/web/src/components/providers/docs-providers.tsx \
     apps/web/src/components/blog \
     apps/web/src/routes/docs \
     "apps/web/src/routes/_public/(marketing)/blog" \
     apps/web/src/routes/api/search.ts

3. 重建空内容骨架(不允许恢复任何 .mdx 示例):
   mkdir -p apps/web/content/docs apps/web/content/blog apps/web/content/author apps/web/content/category
   每个目录只放 README.md(说明该集合的所有权属于产品、如何新增内容)与必要的 meta.json。
   fumadocs 对空 collection 的行为若报错,以最小 meta.json 修正,禁止通过添加示例文章解决。

4. routeTree 重新生成:pnpm --filter web build,确认构建通过。

验收:pnpm check-types --force / lint / fmt:check 全绿;pnpm --filter web build 成功;
content/ 下 git ls-files 不含任何 .mdx。
```

## Stage 2:能力开关化

### 执行 Prompt

```text
目标:docs/blog 成为默认关闭的可选能力。

1. packages/app-config/src/product-config.ts 增加内容能力开关(参照现有 features 模式):
   features.docs: boolean(默认 false)、features.blog: boolean(默认 false),
   经 resolveCommonConfig 暴露;类型与测试同步(__tests__ 更新)。
2. apps/web:header/footer 的 Blog/Docs 链接按 flag 渲染(参照 contactFormEnabled 模式);
   命令面板/搜索入口(api/search 消费者)按 flag 隐藏。
3. 空态:/docs 与 /blog 在集合为空时渲染产品中性空态页(「内容准备中」三语),
   不暴露模版字样;需要新增 i18n 键 contentDocs/contentBlog 命名空间(三语,
   只放 UI 框架文案,不放内容文案)。
4. sitemap:flag 关闭或集合为空时,sitemap 不得包含 /docs、/blog 任何 URL;
   写一个脚本断言(scripts/check-content-surface.mjs)加入 pnpm test 链:
   flag=off 构建的 dist/client/sitemap.xml 不含 /docs|/blog。
5. 修订 docs/new-project-checklist.md:「docs/blog 为模版可选能力,默认关闭;
   启用 = product-config 开 flag + 产品自有内容 + 路由级验收;禁止以模版示例充数。」

验收:pnpm test / check-types --force / lint / fmt:check 全绿;
默认构建的 sitemap 不含 /docs|/blog;flag 开启 + 放入一篇临时测试文章后,
/blog 列表与文章页可渲染、三语切换正常、构建后删除该测试文章。
```

## Stage 3:提交与发版

- Stage 1+2 一个 PR:`feat(web): restore docs/blog as opt-in content capability with zero demo content`。
- 合并后 release-please 发 minor(若走策略 A,则为 v1.2.0)。
- 产品启用时按 checklist 执行;四个 adopt prompt(html5game/aianswers 等)后续补充一句
  「如产品需要文档/文章能力,开 features.docs/blog flag」。

## 红线

- 禁止恢复任何示例 .mdx(24 篇 docs、react-* 营销文、示例 author/category)。
- 禁止整文件覆盖 vite.config.ts / tsconfig.json / package.json —— 逐行 diff 恢复 fumadocs 相关行。
- 不做 landing-composer 恢复;不给 docs/blog 添加任何默认导航入口(flag off 时)。
- i18n 只恢复/新增 UI 框架文案,禁止产品内容文案进模版。
- 每 Stage 结束输出:改动摘要、门禁结果、偏差。

## 监督者检查点

1. `git ls-files apps/web/content` 无任何 .mdx。
2. 默认 flag 构建的 sitemap 与 header/footer 不含 docs/blog。
3. package.json 的 fumadocs 版本与 HEAD 一致(lockfile diff 只涉及恢复的包)。

---

## 审查收口记录(v2,2026-08-18)

第一轮恢复实现经审查发现六个问题,处置如下:

1. **flag 与公开入口耦合** ✅ 已修:拆为「能力开关」(`features.docs/blog` →
   `webConfig.docs/blogEnabled`,控制路由与空态)与「有内容可公开」(构建期
   `flag && hasMdxContent` → `webConfig.docs/blogPublic`,控制导航/页脚/sitemap/搜索入口)。
   回归测试:`apps/web/src/configs/web-config.test.ts`。
2. **内容自动分发管线缺失** → 见下方 Stage 4 契约,作为产品侧后续工作。
3. **正则读取 product-config.ts** ✅ 已修:新建浏览器安全导出
   `packages/app-config/src/content-flags.ts`(唯一开关源,纯字面量,禁止逻辑/密钥/价格),
   `product-config.ts` 与 `vite.config.ts` 均直接 import,删除源码正则解析。
4. **性能门禁** ✅ 已固化:`perf:budget` 通过(首页初始请求无 fumadocs/orama chunk),
   并把 `fumadocs` 加入 `apps/web/performance-budget.json` 的 forbiddenInitialRequestTokens。
5. **空态浏览器级回归测试** → 部分落地:配置契约测试已加;`/blog` 与 `/docs` 空态渲染、
   「内容出现后导航出现」的浏览器级测试列入产品侧验收(见 Stage 4 验收),
   模版侧后续可引入 Playwright 冒烟,单独立项。
6. **提交边界** ✅ 决定:**方案 B 收口**——内容删除 + 能力恢复 + 门禁加固作为一个 PR
   (仓库 squash 合入,main 上本就是一个 commit);`docs/prompts/` 草稿一律不进。

## Stage 4:产品侧内容输入契约(AI 自动分发)

> 这是给**产品仓库**的契约,不是模版代码。模版提供 fumadocs collection 与两态开关;
> 产品按此契约让 AI 管线产出内容,杜绝手工维护 MDX。

### 输入单元(content/<collection>/<locale>/<slug>.mdx)

frontmatter(zod 校验,产品侧 validator 必须实现):

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` / `description` | string | 该语言版本文案;缺语言的文件不得存在 |
| `slug` | kebab-case | 三语言共用同一 slug,URL 稳定 |
| `author` | string | 引用 `content/author/<locale>/<slug>.mdx` 的作者 slug |
| `categories` | string[] | 引用 `content/category/*` 的 slug |
| `status` | `draft` \| `published` \| `archived` | 只有 published 进入构建与 sitemap |
| `publishedAt` / `updatedAt` | ISO date | sitemap lastmod 与排序依据 |
| `seo` | `{ title?, description?, canonical?, noindex? }` | 缺省由页面模板生成 |
| `cover` | string | R2/资产引用,不允许外链盗链 |

三语状态:`en/zh/jp` 三个目录各自持有该 slug 的文件即视为该语言 ready;
缺语言 = 该语言不生成页面,不 fallback 到别的语言(避免重复内容 SEO 问题)。

### 管线

```text
AI 生成/采集 -> 契约校验(zod frontmatter + 引用存在性 + 三语完整度报告)
  -> 写入 content/ -> pnpm content:validate(产品侧,纳入 pnpm test)
  -> pnpm build(vite 自动判定 hasMdxContent,flag&&content 时自动公开)
  -> 部署
```

### 验收(产品侧)

- `content:validate` 对缺 seo 字段、坏 slug、缺引用、draft 误入构建报错。
- 浏览器级回归:`/blog` 空态、`/docs` 空态、发布首篇后导航出现——三条路由级测试。
- sitemap 只含 published 且该语言 ready 的 URL。

### 后续决策(另立项)

- 内容量上到数百篇后,MDX-in-repo 模式是否迁 D1 内容表 + 按需渲染(构建时长与编辑流权衡)。
- `validate-blog-content.mjs` 泛化为 `content:validate` 并下沉到模版(需两个产品验证契约稳定后)。
