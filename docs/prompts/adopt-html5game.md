# 采用 Prompt:html5game(HTML5.ai)用新模版重建 —— 全新领养

> 目标产品:HTML5.ai(HTML5 游戏平台)。
> 源仓库:`/Users/linyan/dev/html5game/html5-ai-product-blueprint-v3`(蓝图 + 原型 + 内容源,**不是代码基础**,只读引用,禁止修改)。
> 目标目录:新建 `/Users/linyan/dev/html5ai`(**不在旧目录内施工**);旧目录 `/Users/linyan/dev/html5game` 只作为规格与游戏内容来源保留。
> 模版基线:`gt88domain/easystarter-template` ≥ v1.0.0(clean-baseline 发布,含 PR #86,已打 tag)。
> 在基线发布前开工的,以分支 `hardening/clean-baseline` 为基线,并在下游 `.template/source.json` 登记。
> 执行方式:每个 Stage 由执行 AI 一次跑完,**只在验收门禁停下**;监督者只看门禁结果与 diff 摘要。

## Stage 0 结论(待所有者签字;以下为预填建议)

- **路线:全新领养(fresh adoption)**。blueprint-v3 是零依赖原型与产品规格,不含需保留的生产代码、
  用户数据或 D1 历史。禁止把 blueprint 的 `apps/portal`、`apps/play` 原型代码搬进新仓库;
  允许搬运的只有:`packages/game-sdk/game-sdk.js` 的协议定义、`tools/import-game.mjs` 的校验逻辑、
  `data/route-matrix.csv` 的奇偶表、`games/` 与 `artifacts/` 的游戏内容。
- **数据归属**:D1 拥有全部业务数据(games/releases/categories/tags/…);R2 拥有不可变 release 与图片资产;
  公开读模型直接读 D1,不做 fixture 中转。
- **Defer 清单(本次一律不做)**:支付、积分、Tickets、移动端、Party/Durable Objects、Creator Studio、
  AI Build、评论图片上传以外的资产上传、多语言 SEO 扩展(先用模版自带 en/zh/jp)。
- **非迁移对象**(blueprint 里有描述但本周期禁止顺手发明):AI Game Creator、Director、Challenge、
  Rewards、Pricing 真实收单、img2threejs、Asset Repair。
- **Preserve 契约**(来自 `docs/10-play-runtime.md`,一字不改):
  - Portal 与 Play 必须独立 origin;Play 只服务不可变公开静态 Build,`Access-Control-Allow-Origin: *`,
    不携带 Portal cookie 与用户态响应。
  - iframe sandbox 恰好为 `allow-scripts allow-pointer-lock allow-orientation-lock`,
    禁止加 `allow-same-origin` / `allow-top-navigation` / `allow-popups` / `allow-downloads` / `allow-forms`。
  - Portal 只接受 `origin === "null"` 且 `source` 恰好等于当前 iframe window 的 postMessage 事件。
  - 导入校验:路径穿越/符号链接检查、必须含 `index.html`、≤ 2000 文件、≤ 150 MB、内容 checksum、
    不执行被导入的游戏代码。
- **Replace**:无(全新仓库)。

## 前置门(全部满足才允许 Stage 1 开工)

1. 模版侧 PR #86 已合入,或显式以 `hardening/clean-baseline` 分支为基线。
2. 从模版新建下游仓库 `html5ai`(或所有者定名),干净 worktree,不携带 blueprint 的 `node_modules`。
3. 完成 playbook 决策:`docs/migration/01-data-owner.md`(D1=业务数据、R2=release/图片)与
   `04-security-check.md`(sandbox 契约、Play origin 无 cookie、导入校验上限)。
4. 所有者确认域名规划:Portal `html5.ai` / Play `play.html5.ai`(或临时 `*.workers.dev` 先行)。

## 版本计划总览

| 版本 | 阶段 | 内容 | 门禁 |
| --- | --- | --- | --- |
| v0.1.0 | Stage 1 | 下游基线:模版领养 + 功能裁剪 + 品牌 | 模版门禁全绿 |
| v0.2.0 | Stage 2 | Play Runtime 双 origin + SDK 协议 | 沙箱/CORS 契约测试 |
| v0.3.0 | Stage 3 | Catalog 模块 + 导入工具 + 14 条公开路由 | 路由奇偶 + SEO 检查 |
| v0.4.0 | Stage 4 | 10–30 款许可游戏导入上线 | 真机桌面/移动验收 |
| v1.0.0 | 另出 prompt | 玩家平台(收藏/评论/排行榜/社区) | — |

---

## Stage 1(v0.1.0):下游基线

### 执行 Prompt

```text
你在 gt88domain/easystarter-template 的新下游仓库工作,产品是 HTML5.ai(HTML5 游戏平台)。

先读:AGENTS.md、GOVERNANCE.md、docs/architecture-boundaries.md、docs/template-adoption.md、
packages/app-config/src/product-config.ts。

任务:
1. 用 product-config 关闭:billing、credits、tickets、mobile;保持 auth、admin、storage、jobs 的默认值,
   但 jobs 在本产品 v0 不需要——按 packages/app-config 的 feature 配置将 jobs 设为 false。
2. 同步裁剪 apps/server/wrangler.jsonc:删除 queues(producers/consumers)、triggers.crons、
   vars.JOB_QUEUE_DLQ_NAME。注意 wrangler 是静态配置,不会跟随 feature flag 自动变化。
   保留 d1_databases、r2_buckets、billing 关闭后不需要的支付相关 vars 注释说明。
3. 品牌:apps/web 的 webConfig AppName 改为 "HTML5.ai";landing 页文案可以保留模版默认,
   首页 hero 改为游戏平台一句话定位即可,不做视觉重做。
4. i18n 保留 en/zh/jp 三语言;新增文案必须三语齐全。
5. 治理登记:更新 .template/source.json 的基线记录;如有受保护差异,按 template-kit 登记 MOD。
6. wrangler.jsonc 的 replace-* 占位符暂不替换为真实资源(部署阶段才做),
   但 name 改为 html5ai-api / html5ai-web 占位。

验收门禁(必须全部通过才停):
- pnpm install --frozen-lockfile 或 pnpm install 后 pnpm test 全绿
- pnpm check-types / pnpm lint / pnpm fmt:check 全绿
- pnpm dev:web+server 本地可起,首页、登录页、/admin(未登录重定向)可访问
- git 提交为单一 commit:chore(adopt): baseline HTML5.ai downstream from easystarter v0.12.x

偏差处理:发现模版文档与代码不一致,停下来报告,不擅自修改模版核心。
```

## Stage 2(v0.2.0):Play Runtime 双 origin

### 执行 Prompt

```text
约束:以下契约逐字来自产品蓝图,禁止修改语义:
- iframe sandbox 恰好 "allow-scripts allow-pointer-lock allow-orientation-lock"
- Play origin 只服务不可变公开 Build,ACAO: *,不读不写 cookie,不返回用户态内容
- Portal 校验 postMessage:origin === "null" 且 source === 当前 iframe.contentWindow

任务:
1. 在下游仓库新增 apps/play:一个极简 Cloudflare Worker(允许用 Hono 或原生 fetch handler),
   路由 /releases/{slug}/{version}/* 从 R2 bucket 读对象,响应头:
   Cache-Control: public, max-age=31536000, immutable;Access-Control-Allow-Origin: *;
   正确 Content-Type(至少 html/js/css/wasm/json/png/webp/avif/mp3/ogg)。
   不设置 Set-Cookie;不记录用户身份。wrangler 中独立 name(html5ai-play)。
2. 新增 packages/game-sdk:把 blueprint 的 packages/game-sdk/game-sdk.js 协议事件
   (GAME_READY/GAME_STARTED/GAME_PAUSED/GAME_RESUMED/GAME_MUTED/GAME_RESTARTED/
   GAME_COMPLETE/GAME_OVER)搬入,包成带 zod 校验的 TS 模块。GAME_COMPLETE 载荷为
   { type, score: number, durationMs: number }。
3. apps/web 新增 modules/play:
   - /game/$slug/play 路由(本 Stage 先用一个内置 demo 游戏 slug,数据可硬编码在模块内,
     Stage 3 接入 D1 后替换)。
   - Portal 玩家外壳:全屏 iframe、重启/暂停/静音按钮、标题栏。
   - postMessage 监听器按上述契约校验并暂存事件(本 Stage 只 console.debug,不入库)。
4. CSP/安全头:Portal 页 iframe 的 src 指向 VITE_PLAY_ORIGIN 环境变量;本地 dev 时
   apps/play 用 wrangler dev --port 3100。
5. 把 blueprint tools/check.mjs 中关于 sandbox/CORS/双 origin 的断言移植为本仓库的
   scripts/check-play-contract.mjs,加入 pnpm test 链。

验收门禁:
- pnpm test 全绿(含 check-play-contract)
- pnpm check-types / lint / fmt:check 全绿
- 本地双 dev server 下 /game/demo/play 能加载 demo Build,iframe sandbox 属性精确匹配,
  DevTools 中游戏 postMessage 事件被正确接收且伪造 origin 的事件被拒绝
- 提交:feat(play): dual-origin play runtime with sandboxed SDK protocol
```

## Stage 3(v0.3.0):Catalog + 导入 + 公开路由

### 执行 Prompt

```text
先读:apps/server/src/modules/README.md、apps/server/src/db/README.md、
docs/orpc-worker-boundaries.md、blueprint 的 data/route-matrix.csv。

任务:
1. D1 schema(apps/server/src/db/schema/,Drizzle,结构迁移与数据迁移分离):
   games(slug 唯一、title、description、category_id、status、created_at…)、
   releases(game_id、version、checksum、r2_prefix、file_count、byte_size、status)、
   categories(slug、name_i18n json)、tags(slug、name_i18n json)、game_tags。
   运行 pnpm db:generate 生成迁移;本地 pnpm db:migrate:local 验证。
2. Server 模块 apps/server/src/modules/catalog:公开只读 oRPC 过程
   (listGames 分页/search/category/tag、getGameBySlug、getReleaseManifest),
   公开过程必须限流与参数校验(zod),遵守 docs/rate-limiting.md。
3. 导入工具:移植 blueprint tools/import-game.mjs 为 scripts/import-game.mts
   (tsx 运行)。保留全部校验(路径穿越、符号链接、index.html、2000 文件/150MB、checksum)。
   写入方式:本地 CLI 直接用 S3 兼容 API 写 R2(releases/{slug}/{version}/ 前缀),
   用 wrangler d1 或 better-sqlite3 直写本地/远程 D1 记录。不走运行时 HTTP 上传。
   --env local|production 必选;production 需二次确认交互。
4. Web 公开路由(modules/catalog + 路由文件保持薄),恰好覆盖 route-matrix.csv 中
   Launch 阶段、access=Public、group ∈ {Public Portal, Game, Sharing} 的 14 条:
   / /explore /search /categories /category/$slug /leaderboards(可先空态)
   /about /game/$slug /game/$slug/play(接 Stage 2)/game/$slug/versions
   /game/$slug/version/$version /game/$slug/report(表单先入 audit log)
   /share/$token(可先 501 占位,标记 Phase 2)
   每条:buildSeoHead(title/description/canonical/robots 按蓝图 07 SEO 节:公开游戏、
   分类 index;play/versions 页 canonical 指向 /game/$slug;/share noindex)。
   sitemap 接入模版构建期 sitemap 生成。
5. Admin:在现有 admin 后台加一个「游戏导入记录」只读列表页(读 D1 releases),
   不做编辑器。admin 权限走 requireAdmin,不写前端隐藏兜底。
6. i18n:所有公开文案 en/zh/jp 三语;游戏 title/description 存原文不做翻译。

验收门禁:
- pnpm test / check-types / lint / fmt:check 全绿
- scripts/check-route-parity.mjs(新建,加入 test 链):对 route-matrix.csv 的目标子集
  逐条断言本地 dev 返回 200 且 canonical/robots 符合矩阵
- 用 blueprint games/skyline-runner 跑通 import → R2 → D1 → /game/skyline-runner
  与 /play 全链路
- 提交:feat(catalog): game catalog, import pipeline and public routes
```

## Stage 4(v0.4.0):内容上线

- 所有者提供 10–30 款已获许可的游戏 ZIP/目录;执行 AI 批量跑 `scripts/import-game.mts`。
- 逐款真机验收:桌面 Chrome/Safari + 手机 Safari/Chrome;检查 DPR≤2、页面隐藏暂停、
  音频首次交互后加载(蓝图 10 的 Mobile rules)。
- 生产部署走 `apps/server/.production-safety.env` 预检;Play origin 独立域名验收 cookie 隔离。
- SEO:首页/Explore/分类/游戏详情 的 canonical、OG、sitemap.xml、robots 人工抽查 + Search Console 提交。

## 红线

- 不改模版核心;确需改动时停下来报告,由所有者决定走上游 PR。
- iframe sandbox 与双 origin 契约逐字遵守,任何「为了方便」的放开都是事故。
- 导入工具不执行游戏代码;不在 Worker 运行时做 ZIP 解压上传(请求体限制)。
- D1 迁移只进不退;结构迁移、数据迁移、种子分开。
- 不做 Defer 清单里的任何功能,不做「顺手优化」。
- 每 Stage 结束输出:改动摘要、门禁结果、与计划的偏差;偏差未批准不得进入下一 Stage。

## 监督者检查点(所有者/监督 AI 只看这些)

1. 每个 Stage 的 commit 是否为单一语义提交,diff 是否只在预期目录。
2. 门禁输出是否真实全绿(要求粘贴命令输出,不接受「应该过了」)。
3. Stage 3 后抽查 /game/skyline-runner/play 的 iframe 属性与 Network 里 Play origin 的响应头。
