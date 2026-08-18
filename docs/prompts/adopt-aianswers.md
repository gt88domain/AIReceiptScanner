# 采用 Prompt:aianswers(AI 问答知识平台)用新模版重构 —— 全新领养

> 目标产品:AI 问答知识库(问题 + AI 生成带引用答案 + 主题/模型/合集 + 语义搜索)。
> 旧仓库:`/Users/linyan/dev/answer/aianswers`(模版 0.4.0 fork,**只作规格与数据来源,不搬代码**)。
> 模版基线:`gt88domain/easystarter-template` ≥ v1.0.0(clean-baseline 发布,含 PR #86,已打 tag)。
> 执行方式:每个 Stage 由执行 AI 一次跑完,**只在验收门禁停下**;监督者只看门禁结果与 diff 摘要。

## Stage 0 结论(待所有者签字;以下为预填建议)

- **路线:全新领养(fresh rebuild)**。旧仓停留在模版 0.4.0,产品模块写在 `custom/` 时代,
  与当前 modules/ + capability 治理不兼容,**禁止搬运旧模块代码**;允许参考的:领域模型语义、
  URL 结构、provider/向量索引选型。允许搬运的:生产内容数据(见下)、CSV 知识目录。
- **数据归属**:新 D1 拥有全部业务数据;R2 拥有图片资产;Vectorize 拥有语义索引;AI 生成走
  外部 provider(DeepSeek 兼容端点)+ Workers AI binding 备用。
- **内容数据决策(必须所有者确认)**:
  - 推荐方案:**内容迁、关系不迁**。`aa_topic/aa_category/aa_question/aa_answer/aa_source/
    aa_answer_source/aa_model/aa_collection` 从旧生产库导出 JSON,经转换脚本写入新库;
    用户、投票、评论、举报、generation_request 历史**不迁**(产品前期,关系数据价值低)。
  - 旧 D1(`aianswers-production`,id `667a7596-…`)**保留只读,禁止删除或写**。
  - 若所有者确认「全部重起」,本阶段退化为纯 seed 脚本,导出步骤跳过。
- **Preserve**:URL 结构(`/q/$slug`、`/question/$publicId/$slug`、`/topic/$slug`、`/model/$slug`、
  `/collection/$slug`、`/hot/$period`、`/search`);`/q/*` 短链 canonical 指向 `/question/*` 长链;
  语义搜索(Vectorize)与 cron 发现任务的产品语义。
- **Defer 清单**:支付、积分、Tickets、移动端、社区高级功能(关注/动态流)、图片评论、多语言 SEO 扩展。
- **Replace**:无代码替换(全新仓库);旧站域名切换见 Stage 5。

## 前置门(全部满足才允许 Stage 1 开工)

1. 模版 ≥ v1.0.0 tag 已发布(已满足:clean-baseline 即 v1.0.0)。
2. 所有者确认内容数据决策(内容迁 or 全重起)。
3. 完成 playbook 决策:`docs/migration/01-data-owner.md` 与 `04-security-check.md`
   (AI key 仅存 secret;公开读接口限流;生成任务幂等键)。
4. 从模版新建下游仓库,干净 worktree。

## 版本计划总览

| 版本 | 阶段 | 内容 | 门禁 |
| --- | --- | --- | --- |
| v0.1.0 | Stage 1 | 下游基线 + 资源绑定(D1/R2/Queue/AI/Vectorize) | 模版门禁全绿 |
| v0.2.0 | Stage 2 | 知识域 schema + 公开只读页 + 内容导入 | 路由奇偶 + 行数校验 |
| v0.3.0 | Stage 3 | 生成管线(provider + jobs + 状态机) | 幂等测试 + admin 触发 |
| v0.4.0 | Stage 4 | Vectorize 语义搜索 + hot/discovery cron | 搜索契约测试 |
| v0.5.0 | Stage 5 | 社区(投票/评论/举报)+ 上线切流 | 真机验收 + SEO 抽查 |
| v1.0.0 | 另出 prompt | billing/credits、关注流、高级社区 | — |

---

## Stage 1(v0.1.0):下游基线

### 执行 Prompt

```text
你在 gt88domain/easystarter-template 的新下游仓库工作,产品是 AI 问答知识平台。

先读:AGENTS.md、GOVERNANCE.md、docs/architecture-boundaries.md、
packages/app-config/src/product-config.ts、apps/server/src/worker/create-worker-handlers.ts。

任务:
1. product-config:billing、credits、tickets、mobile 关闭;auth、admin、storage、jobs 保持开启
   (本产品 v0 需要 jobs 做 AI 生成与发现任务)。注意 feature flags 与 wrangler 静态配置要同步。
2. wrangler.jsonc 新增绑定(本地 dev 先用占位名):
   - "ai": { "binding": "AI" }
   - "vectorize": [{ "binding": "QUESTION_TOPIC_INDEX", "index_name": "<product>-question-topic-v1" }]
   - vars: AI_PROVIDER_BASE_URL=https://api.deepseek.com/v1(占位可改)
   - secrets required 增加 AI_PROVIDER_API_KEY
3. cron:模版现有 "* * * * *"(outbox 泵)与 "10 16 * * *"(积分维护,本产品 credits 关闭可不注册)。
   本产品发现任务需要 "*/10 * * * *"——在 triggers.crons 增加该表达式,并在
   create-worker-handlers 的 scheduled 中按 controller.cron 路由(参照现有模式),
   本 Stage 只留空 handler + 注释,Stage 4 实现。
4. 运行 pnpm --filter server cf-typegen 更新 worker-configuration.d.ts,
   确认 pnpm check:wrangler-types 通过。
5. 品牌:webConfig AppName、landing 一句话定位;i18n 三语。
6. 治理登记:.template/source.json + 受保护差异 MOD 登记。

验收门禁(全部通过才停):
- pnpm test / check-types / lint / fmt:check 全绿
- wrangler dev 本地起服,/healthCheck 返回 OK
- 提交:chore(adopt): baseline aianswers rebuild from easystarter v0.13.x
```

## Stage 2(v0.2.0):知识域 + 公开只读页 + 内容导入

### 执行 Prompt

```text
先读:apps/server/src/modules/README.md、apps/server/src/db/README.md、
旧仓 /Users/linyan/dev/answer/aianswers/apps/server/src/db/schema/aianswers.ts(只读参考语义)。

任务:
1. D1 schema(apps/server/src/db/schema/,表名前缀自定,不用旧 aa_ 前缀):
   category、topic(+alias)、model、question(+alias、question_topic、question_relation)、
   answer、source、answer_source、collection(+collection_question)。
   状态枚举沿用旧语义:question/answer(model) active/retired/hidden、collection visible/hidden/deleted。
   question 必须同时有 publicId(短随机,URL 用)与 slug;answer 有 publicId。
   pnpm db:generate + db:migrate:local 验证。
2. Server 模块 apps/server/src/modules/knowledge(公开只读 oRPC):
   listTopics/getTopic、listQuestions(分页/按 topic/按 model/hot)、getQuestion(publicId+slug)、
   getAnswer、listCollections/getCollection、listModels/getModel。
   全部 zod 入参校验 + 限流(docs/rate-limiting.md)。
3. Web 公开路由(modules/knowledge,路由文件保持薄):
   /q/$slug(301 → canonical)/question/$publicId/$slug(+ /answer/$answerPublicId)、
   /topics、/topic/$slug、/models、/model/$slug、/collections、/collection/$slug、
   /hot/$period(period ∈ day|week|month,先按 created_at 排序占位)。
   SEO:question/topic/model/collection index;canonical 归一(/q → /question);
   sitemap 接入模版构建期生成。
4. 内容导入脚本 scripts/import-content.mts:
   - 输入:旧库导出 JSON(wrangler d1 export 或 SELECT * 脚本导出,由所有者提供文件路径)。
   - 转换:旧 aa_* 行映射到新表;生成新 publicId 时保留旧 slug;记录 id 映射表到 artifacts/。
   - 幂等:重复跑不产生重复行(按 slug/旧 id 去重);输出行数校验报告(旧行数 vs 新行数)。
   - 禁止连接旧库写;旧库导出文件只读。
5. Admin:知识库只读列表(question/answer 分页 + 状态),requireAdmin。
6. i18n 三语;内容原文不翻译。

验收门禁:
- pnpm test / check-types / lint / fmt:check 全绿
- scripts/check-content-parity.mjs(新建,入 test 链):抽样 50 条 question,
  断言新旧库 slug 一一对应、页面 200、canonical 正确
- 提交:feat(knowledge): domain schema, public read routes and content import
```

## Stage 3(v0.3.0):AI 生成管线

### 执行 Prompt

```text
先读:apps/server/src/modules/jobs/README.md、docs/orpc-worker-boundaries.md、
docs/async-reliability.md。旧仓 modules/generation 仅参考语义,不搬代码。

任务:
1. generation_request 表:幂等键(idempotency_key 唯一)、状态机
   queued → running → succeeded | failed(retryable 标记)、provider、model、
   question_id、payload json、result_answer_id、attempt_count。
2. Server 模块 modules/generation:
   - provider.ts:DeepSeek 兼容 chat completions 客户端(fetch、超时、重试分类),
     key 只从 env.AI_PROVIDER_API_KEY 读;禁止日志打印 key 与完整 prompt 中的用户隐私段。
   - service.ts:创建生成请求(写 generation_request + 入 job outbox);
     处理 worker:调 provider → 解析 → 事务写 answer + answer_source + 更新 request 状态。
   - 引用:sources 必须来自 provider 返回或白名单域名;无引用答案标记 needs_review。
   - Job handler 幂等:同一 request 重复投递不产生第二条 answer(按 request_id 唯一约束)。
3. Admin:从 topic/question 触发生成的按钮(protectedProcedure + requireAdmin),
   生成记录列表与失败重试。
4. 焦点测试(必须新增):
   - 同幂等键重复创建只产生一条 request;
   - provider 5xx 可重试、4xx 不可重试;
   - worker 重复投递幂等;
   - 普通用户调 admin 触发被拒。

验收门禁:
- pnpm test / check-types / lint / fmt:check 全绿(含上述新测试)
- 本地 wrangler dev + queue consumer 下,admin 触发一条生成 → answer 落库 → 页面可见
- 提交:feat(generation): idempotent AI answer pipeline with citations
```

## Stage 4(v0.4.0):语义搜索与发现

### 执行 Prompt

```text
任务:
1. modules/search:question 发布/更新时写 Vectorize(embedding 用 Workers AI
   @cf/baai/bge-base-en-v1.5 或 provider embedding,二选一并在 DECISIONS 记录);
   /search 路由:全文 LIKE 兜底 + 向量召回合并排序,zod 校验 + 限流。
2. 回填脚本 scripts/backfill-embeddings.mts:批量为存量 question 生成向量,幂等可断点续跑。
3. discovery 任务:实现 Stage 1 留下的 "*/10 * * * *" handler——
   扫描新 question 做向量化补漏、更新 hot 排序物化表(hot_score 按创建时间+浏览/投票衰减,
   v0 无浏览数据时按创建时间);必须幂等(重复跑结果一致)。
4. /search、/hot/$period 页面接入真实数据;hot 页 SEO index。

验收门禁:
- pnpm test / check-types / lint / fmt:check 全绿
- 搜索契约测试:固定 query 断言返回结构与非空字段;discovery handler 双跑结果一致测试
- 提交:feat(search): vector semantic search and scheduled discovery
```

## Stage 5(v0.5.0):社区与上线

- 投票(answer_vote)、评论(comment,一级即可)、举报(report 入 moderation 队列)。
- 内容规模导入(Stage 2 脚本跑全量)+ 真机验收。
- 生产部署:`.production-safety.env` 预检;secrets(ADMIN_EMAILS/BETTER_AUTH_SECRET/
  AI_PROVIDER_API_KEY)按 docs/production-configuration.md。
- 切流:旧 workers.dev 子域保留只读,新站绑正式域名;旧 D1 保持只读不删。
- SEO:canonical/OG/sitemap/robots 抽查 + Search Console。

## 红线

- 不搬旧仓代码文件;语义参考必须重写成符合当前 modules/ 治理的代码。
- 不写旧生产库、不删旧资源;旧库导出文件只读。
- AI key 只存 secret;日志不打印 key。
- Job handler 必须幂等(at-least-once 投递);D1 迁移只进不退。
- 不做 Defer 清单;偏差未批准不进下一 Stage。

## 监督者检查点

1. 每 Stage 单一语义 commit,diff 只在预期目录。
2. 门禁命令输出真实粘贴,全绿才签字。
3. Stage 2 后抽查 10 条 question 页 canonical 与 SSR 内容。
4. Stage 3 后审查 generation_request 幂等键唯一索引与 worker 幂等测试真实存在。
