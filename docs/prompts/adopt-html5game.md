# 采用 Prompt:html5game(HTML5.ai)用新模版重建 —— 全新领养

> 目标产品:HTML5.ai(HTML5 游戏平台)。
> 规格权威(优先级从高到低):
> 1. `/Users/linyan/dev/html5/html5ai-docs-v3/`(**Approved v3.0 产品圣经**,Master Plan + 00–13 文档,
>    只读引用)——产品范围、用户路径、路由与验收契约以它为准;
> 2. `/Users/linyan/dev/html5game/html5-ai-product-blueprint-v3`(运行时契约 + 路由矩阵 + 游戏内容源,
>    只读引用,禁止修改)——Play runtime 沙箱契约、route-matrix.csv 奇偶表、games/artifacts 内容以它为准。
> 两者冲突时以 html5ai-docs-v3 为准,并在偏差记录中说明。代码归位始终遵守目标仓库
> `AGENTS.md` 与 architecture boundaries（当前模板使用 `modules/<domain>`，不沿用旧资料的 `custom/`）。
> 产品核心(一级任务,不可裁剪):**Play**(无登录即玩)与 **Create**(自然语言创建/修改/换皮/发布);
> **Party、Assets、PWA、Library 是服务两者的辅助能力,属于本产品内核,不是可选项。**
> 目标目录:新建 `/Users/linyan/dev/html5ai`(**不在旧目录内施工**);旧目录 `/Users/linyan/dev/html5game` 只作为规格与游戏内容来源保留。
> 模版基线:`gt88domain/easystarter-template` ≥ **v2.6.0**(稳定 tag;含公开页原语、模板预览与内容面修复)。
> 在下游 `.template/source.json` 登记实际采用的 tag。
> 执行方式:**每个 Stage 是路线图切片,不是一次提交。** 实现一律走临时 worktree → Draft PR →
> 本地与 CI 门禁 → 所有者复审 → 合并 main。涉及生产资源(D1/Queue/R2/DO/外部 AI Runner)、迁移、
> 数据导入或部署时,**须在动作前单独取得授权**;部署仅从 main 精确 SHA 进行,并把版本 ID、
> 输入 manifest/hash 与验证结果写入 PR 评论。监督者只看门禁结果、PR 评论留痕与 diff 摘要。

## Stage 0 结论(待所有者签字;以下为预填建议)

- **路线:全新领养(fresh adoption)**。blueprint-v3 是零依赖原型与产品规格,不含需保留的生产代码、
  用户数据或 D1 历史。禁止把 blueprint 的 `apps/portal`、`apps/play` 原型代码搬进新仓库;
  允许搬运的只有:`packages/game-sdk/game-sdk.js` 的协议定义、`tools/import-game.mjs` 的校验逻辑、
  `data/route-matrix.csv` 的奇偶表、`games/` 与 `artifacts/` 的游戏内容。
- **数据归属**:D1 拥有全部业务数据(games/releases/categories/tags/…);R2 拥有不可变 release 与图片资产;
  公开读模型直接读 D1,不做 fixture 中转。
- **Defer 清单(v0 不做,但属于产品路线图,后续 Stage 排期)**:
  - Creator(Stage 5):`/game-maker`、`/game-maker/projects/:projectId`、Prompt Composer、Revision、发布门;
  - Assets(Stage 6):`/assets`、素材槽位换皮;
  - Party(Stage 7):`/party`、`/party/create`、`/party/join`、`/party/:roomCode`、Durable Object 回合制房间。
  - 支付/积分:v0 关闭;Creator 上线时按 05-mvp-modules 恢复 credits(生成额度/配额),payments 届时再评估。
  - Tickets、原生移动端(冻结 `apps/native`)、多语言 SEO 扩展(先用模版自带 en/zh/jp)。
- **非迁移对象**(blueprint 里有描述但产品圣经未批准,本周期禁止顺手发明):Director、Challenge、
  Rewards、img2threejs、第三方 ZIP 自助上传/开放开发者市场、3D/MMO/百人实时对战。
  AI Game Creator 与 Asset Repair **不是**非迁移对象——它们是 Stage 5/6 的核心,只是不在 v0。
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

1. 模版 ≥ v2.6.0 tag 已发布(已满足;不得以任何预发布分支为基线)。
2. 从模版新建下游仓库 `html5ai`(或所有者定名),干净 worktree,不携带 blueprint 的 `node_modules`。
3. 完成 playbook 决策:`docs/migration/01-data-owner.md`(D1=业务数据、R2=release/图片)与
   `04-security-check.md`(sandbox 契约、Play origin 无 cookie、导入校验上限)。
4. 所有者确认域名规划:Portal `html5.ai` / Play `play.html5.ai`(或临时 `*.workers.dev` 先行)。

## 产品完整路由契约(目标态,对齐所有者确认的四组核心)

| 组 | 路由 | 阶段 |
| --- | --- | --- |
| Game | `/games`、`/game/:gameSlug`、`/game/:gameSlug/play`、`/game/:gameSlug/versions` | v0.3(目录/详情/版本) |
| Party | `/party`、`/party/create`、`/party/join`、`/party/:roomCode` | v0.7(Stage 7) |
| Creator | `/game-maker`、`/game-maker/projects/:projectId` | v0.5(Stage 5) |
| Assets | `/assets` | v0.6(Stage 6) |

route-matrix.csv 只作覆盖范围参考;路由命名与分组以上表为准。blueprint 中未列于此表的
子路由须在对应 Work Package 中经所有者确认后才可新增，并记录偏差。

## 版本计划总览

| 版本 | 阶段 | 内容 | 门禁 |
| --- | --- | --- | --- |
| v0.1.0 | Stage 1 | 下游基线:模版领养 + 功能裁剪 + 品牌 | 模版门禁全绿 |
| v0.2.0 | Stage 2 | Play Runtime 双 origin + SDK 协议 | 沙箱/CORS 契约测试 |
| v0.3.0 | Stage 3 | Catalog 模块 + 导入工具 + `/games` 与 Game 组公开路由 | 路由契约 + SEO 检查 |
| v0.4.0 | Stage 4 | 10–30 款许可游戏导入上线 | 真机桌面/移动验收 |
| v0.4.5 | Stage 4.5 | **Creator 基础设施决策(纯决策,不写码)**:Runner 形态/鉴权、Queue/R2 身份、成本与额度、审核、失败撤销 | 所有者签字的基础设施 ADR |
| v0.5.0 | Stage 5 | Creator:projects/Revision/Prompt Composer + `/game-maker` `/game-maker/projects/:projectId` | Prompt→草稿→桌面/手机试玩证据 |
| v0.6.0 | Stage 6 | Assets:素材槽位 + AI 图片/音效 + `/assets` | 换皮 Revision 不可变快照验收 |
| v0.7.0 | Stage 7 | Party:Durable Object 回合制房间 + `/party/*` 四路由 | 双浏览器房间码完成一局五子棋/Quiz |
| v1.0.0 | 另出 prompt | 玩家平台(remix 完整化/leaderboard 真实数据/收藏/评论/社区) | 05-mvp-modules 第 8 节演示顺序全过 |

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
- git 提交为单一 commit:chore(adopt): baseline HTML5.ai downstream from easystarter v2.6.0

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
docs/orpc-worker-boundaries.md、html5ai-docs-v3 的 01-product-scope.md、blueprint 的 data/route-matrix.csv。

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
   --env local|production 必选。工具必须内建(本 Stage 就实现,Stage 4 才允许对生产使用):
   - **dry-run 默认**:不带 --commit 时只输出将写入的对象清单与 D1 记录,不落任何数据;
   - **输入 manifest**:读取所有者提供的许可清单 CSV(slug、许可来源、授权日期、原始路径),
     不在清单内的目录拒绝导入;导入后输出含每个文件 sha256 的 manifest 报告;
   - **不可覆盖**:R2 前缀 releases/{slug}/{version}/ 已存在任一对象即整体失败,禁止覆盖;
   - **写入报告**:结束后输出 JSON 报告(成功/失败、对象数、字节数、D1 行数、manifest hash),
     供粘贴进 PR 评论。
4. Web 公开路由(modules/catalog + 路由文件保持薄),先实现产品圣经要求的最小集合:
   /、/games、/game/$slug、/game/$slug/play(接 Stage 2)、/game/$slug/versions、
   /game/$slug/version/$version。搜索、分类、排行榜、举报、分享等从 route-matrix.csv
   逐条映射到一个已批准的 Work Package 后再加入，不以“凑满 14 条”替代产品决策。
   每条:buildSeoHead(title/description/canonical/robots;公开游戏、分类可 index;
   play/versions 页 canonical 指向 /game/$slug)。
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

- **授权前置**:对生产 R2/D1 执行导入前,所有者单独授权;授权记录(时间、范围、main SHA)写入 PR 评论。
- 所有者提供 10–30 款已获许可的游戏 ZIP/目录**及许可清单 CSV**(许可来源、授权日期);
  清单不全的游戏不得导入。
- 执行 AI 先全量 dry-run,把将写入的对象清单贴入 PR 评论;所有者确认后才允许 --commit。
- 导入完成后把 JSON 写入报告(含每文件 sha256 manifest hash)贴入 PR 评论。
- 逐款真机验收:桌面 Chrome/Safari + 手机 Safari/Chrome;检查 DPR≤2、页面隐藏暂停、
  音频首次交互后加载(蓝图 10 的 Mobile rules)。
- **部署纪律**:生产部署仅从 main 精确 SHA 执行(部署前 PR 已合并),走
  `apps/server/.production-safety.env` 预检;部署后把 Worker 版本 ID、main SHA、
  线上验证结果(URL 抽查截图/状态码)写入 PR 评论。Play origin 独立域名验收 cookie 隔离。
- SEO:首页/`/games`/分类/游戏详情 的 canonical、OG、sitemap.xml、robots 人工抽查 + Search Console 提交。

## Stage 4.5(v0.4.5):Creator 基础设施决策 —— 纯决策,不写码

> 这是 Creator 能否安全落地的分水岭。**Stage 5 开工前必须完成并由所有者签字。**

### 执行 Prompt

```text
先读:html5ai-docs-v3 的 04-creator-runner.md、05-mvp-modules.md 第 5 节、
07-ai-execution-protocol.md、11-architecture-decisions.md。

任务:产出一份 ADR(docs/adr/0001-creator-infrastructure.md),逐项给出决定与理由,禁止写实现代码:
1. 隔离 Runner 形态:AI 生成代码的构建/试玩在哪里执行
   (候选:CF Containers / 隔离 Worker + 受限 API / 外部沙箱服务),含网络 egress 策略;
2. Runner 鉴权:server → Runner 的调用凭证形态、密钥存哪(secret store)、轮换策略;
3. 资源身份:Queue 名、R2 bucket(源码快照/构建包/截图/报告)、preview origin 的命名与生命周期;
4. 生成成本与额度:单次生成的 provider 成本上限、credits 扣减规则(模版 credits 模块)、
   免费用户额度、超限行为;
5. 内容审核:Prompt/生成结果/发布前的审核节点(最小实现,对齐 05 moderation);
6. 失败与撤销:生成失败的重试上限、半成品 Revision 的清理、已发布 Release 的撤销与下架流程;
7. 容量与滥用:每用户并发生成数、每 IP 频率、队列积压告警阈值。

验收门禁:
- ADR 七项全部有明确决定(不接受「待定」),与产品圣经冲突处逐条列出;
- 所有者逐条签字(PR 评论);签字前 Stage 5 的任何 PR 不得创建。
- 提交:docs(adr): creator infrastructure decisions
```

## Stage 5(v0.5.0):Creator —— Prompt 创建/修改/发布

> 产品圣经依据:`01-product-scope.md` 第 1/3 节(Create 是一级任务)、`05-mvp-modules.md` 第 4 节
> (projects/templates/generation 模块)、第 7 节 Git 检查点 8–9。
> **开工前置:Stage 4.5 ADR 已由所有者逐条签字;本 Stage 的资源身份/鉴权/额度/审核/撤销
> 一律按 ADR 执行,不得在实现中重新发明。** Queue、R2 bucket、Runner、preview origin 等
> 生产资源的创建动作,执行前单独取得授权(对齐总执行规则)。

### 执行 Prompt

```text
先读:html5ai-docs-v3 的 01-product-scope.md、03-game-template-contract.md、04-creator-runner.md、
05-mvp-modules.md、07-ai-execution-protocol.md。

任务:
1. D1 schema 新增(Drizzle,结构/数据迁移分离):
   projects(id、owner_id、slug、title、template_id、status、published_release_id、created_at…)、
   project_revisions(id、project_id、parent_revision_id、prompt、spec_json、status)、
   templates(id、slug、name、engine(canvas|phaser)、orientation、asset_slots json、version)、
   generation_jobs(id、project_id、revision_id、status、idempotency_key、error、created_at…)。
   不变量:Revision 必须有父版本;published_release_id 只能指向通过验收的 release。
2. Server 模块(apps/server/src/modules/):
   - projects:CRUD、Revision 树、发布门(验收通过才允许 publish),全部 requireUser;
   - generation:生成任务入队(Cloudflare Queues)、幂等键、状态机、失败重试;
     遵守 apps/server/src/modules/jobs 的幂等约定,AI 代码执行必须在隔离 Runner,
     不在普通 Worker 中执行(产品圣经 05 第 5 节红线)。
   - templates:注册首批三个模板(canvas-puzzle、phaser-action-2d、turn-based-room),
     模板作为普通源文件由 Runner 复制,不单独成 workspace。
3. Web 模块(modules/creator,路由保持薄):
   - /game-maker:一句话 Prompt 输入 → 推荐模板与横/竖屏选择 → 创建 project + 首个 revision;
   - /game-maker/projects/:projectId:我的项目、对话修改、桌面/手机预览切换、Revision 回退、
     自动验收状态、发布按钮;手机端 Tab 布局,桌面端多栏(产品圣经 01 第 2 节)。
   - 预览走 preview origin 或本 Stage 允许的等价隔离 iframe,复用 Stage 2 的 SDK 协议。
4. 恢复 credits:生成扣额度走模版 credits 模块(capability 门控),不发明自有配额表。
5. i18n 三语;新增文案全部入 packages/i18n。

验收门禁:
- pnpm test / check-types / lint / fmt:check 全绿
- 端到端证据:Prompt 创建一个 Canvas 游戏草稿 → 桌面 1440×900 与手机 390×844 各完成一局
  (截图 + 控制台/网络摘要,按产品圣经第 8 节验收清单)
- 对话修改产生新 Revision 且可回退;发布门拦截未验收 Revision
- 提交:feat(creator): prompt composer, revisions and publish gate
```

## Stage 6(v0.6.0):Assets —— 槽位素材与换皮

### 执行 Prompt

```text
先读:html5ai-docs-v3 的 03-game-template-contract.md(素材槽位定义)、05-mvp-modules.md(assets 模块)。

任务:
1. D1 schema 新增:assets(id、owner_id、kind(image|audio)、r2_key、source(ai|upload)、status)、
   asset_slot_bindings(project_id、revision_id、slot、asset_id)。
   R2 对象键必须含 owner/project/revision 前缀(05 第 6 节不变量)。
2. Server 模块 modules/assets:AI 图片/音效生成(走外部 API,不在 Worker 内跑重计算)、
   上传、槽位映射、换皮产生新 Revision(玩法不变),快照 immutable。
3. Web 模块(modules/assets):
   - /assets:我的素材库(需登录),可按项目过滤;按槽位生成/替换图片或音效;
   - 对生成失败或校验不过的素材提供重新生成/修复，不接 blueprint 的 img2threejs。
4. 素材进 moderation 队列(按 05 moderation 模块的最小实现:状态字段 + admin 审核列表,
   复用模版 admin,不做复杂审核流)。

验收门禁:
- pnpm test / check-types / lint / fmt:check 全绿
- 换皮证据:同一项目换皮前后两个 Release 均可玩,旧 Release 对象未被覆盖(R2 键对比)
- 提交:feat(assets): slot-based asset generation and reskin snapshots
```

## Stage 7(v0.7.0):Party —— 回合制房间

> **开工前置(资源授权)**:本 Stage 新建独立实时 Worker 与 Durable Object 命名空间,
> 是新的生产资源和长连接安全边界。动工前必须单独取得授权,并先在 PR 描述中给出:
> DO/Worker 命名、每房间与每用户连接上限、消息频率上限与滥用处置(踢出/封房间)、
> 空闲房间回收策略、回滚方案(关闭路由 + 删除 DO 命名空间的步骤与数据影响)。

### 执行 Prompt

```text
先读:html5ai-docs-v3 的 01-product-scope.md 第 3/7 节(先回合制)、05-mvp-modules.md(party 模块)、
11-architecture-decisions.md 中联机相关条目。

任务:
1. 新增 apps/realtime:Cloudflare Durable Objects,一房间一个 DO;2–8 人;
   WebSocket Hibernation;服务端裁决;断线重连;消息幂等。
   wrangler 独立 name(html5ai-realtime),ws 入口与主站分离。
2. D1 schema 新增:party_room_summaries(房间码、游戏、人数、状态、结果)。
   房间实时状态只在 DO 内,D1 只存摘要(05 第 5/6 节)。
3. Web 模块(modules/party):
   - /party:建房或输入房间码入口;
   - /party/create:选游戏(首版五子棋或 Quiz)→ 生成房间码与邀请链接;
   - /party/join:输入房间码加入;
   - /party/:roomCode:房间页,等待区 + 游戏 iframe(复用 Stage 2 SDK 的 Party 客户端事件)。
4. 首个样例:五子棋或 Quiz 一个,回合制,服务端裁决胜负,结果写入 room summary。
5. 登录策略:参与 Party 需要登录身份(产品圣经:登录用于联机身份);观战链接可只读。

验收门禁:
- pnpm test / check-types / lint / fmt:check 全绿
- 双浏览器证据:通过房间码完成一整局,含一次断线重连;操作重放不产生重复回合
- 提交:feat(party): turn-based Durable Object rooms
```

## 红线

- 不改模版核心;确需改动时停下来报告,由所有者决定走上游 PR。
- iframe sandbox 与双 origin 契约逐字遵守,任何「为了方便」的放开都是事故。
- 导入工具不执行游戏代码;不在 Worker 运行时做 ZIP 解压上传(请求体限制);
  AI 代码执行只在隔离 Runner,不在普通 Worker。
- D1 迁移只进不退;结构迁移、数据迁移、种子分开。
- 只做当前 Stage 范围;「非迁移对象」清单任何时候都不做,不做「顺手优化」。
- **无授权不动生产**:任何生产资源创建/迁移/导入/部署,动作前必须有所有者的显式授权记录;
  部署只从 main 精确 SHA 出发,版本 ID 与验证结果必须回写 PR 评论。
- 每 Stage 结束输出:改动摘要、门禁结果、与计划的偏差;偏差未批准不得进入下一 Stage。

## 监督者检查点(所有者/监督 AI 只看这些)

1. 每个 PR 是否为单一语义切片,diff 是否只在预期目录;Stage 内多个 PR 的拆分是否合理。
2. 门禁输出是否真实全绿(要求粘贴命令输出,不接受「应该过了」)。
3. 授权留痕:凡涉及生产资源/迁移/导入/部署的 PR,评论中是否有授权记录、main SHA、
   版本 ID、manifest/hash 与验证结果;缺一项即打回。
4. Stage 4.5 ADR 是否七项全有决定且所有者逐条签字;未签字则 Stage 5 的任何 PR 打回。
5. Stage 3 后抽查 /game/skyline-runner/play 的 iframe 属性与 Network 里 Play origin 的响应头。
