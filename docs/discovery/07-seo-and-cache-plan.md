# 07 — SEO & Cache Plan（SEO 与缓存）

状态：Deferred candidate；仅在产品已决定具体公开路由与缓存实现后适用，不属于 v5 最小 Foundation。

本文件中的统一 sitemap、`/api/discovery/v1/*`、SEO Page、Query AST 和缓存 key 方案均为候选，不得覆盖各下游当前 canonical、sitemap 或路由所有权。

---

## 1. Canonical

- 每个可索引页面输出自引用 canonical（经上游 `apps/web/src/utils/seo.ts`）。
- 筛选/分页列表页：canonical 指向**去除非白名单参数后的规范化 URL**；page 模式分页页 canonical 指向自身页码（配合 prev/next link 提示）；cursor 视图不产生独立可索引 URL。
- 同一筛选状态只有一个 URL 序列化形态（06 §2 的默认值清理是前提）；命中已发布 SEO Page 的 AST 组合，列表 URL 301/308 到 `compiled_path`（AB 已验证的模式，统一在 `resolveCanonicalRedirect` 执行）。

## 2. Index / Noindex（统一策略，垂直不得自定）

| 页面 | robots |
| --- | --- |
| 类型列表默认视图、Detail、Category hub（count>0）、Collection、已发布 SEO Page | `index,follow` |
| 未策划的任意 facet 组合、`/search`、带 `q` 的任何页 | `noindex,follow` |
| 内部无价值且抓取成本高的组合（深分页 page>N、多重 exclude 组合） | `noindex,nofollow` |
| Tag hub | count > 阈值（默认 5，产品可调）→ index；否则 `noindex,follow` |
| Category hub count=0、未发布内容 | `noindex,follow` / 404 |

说明：PD 实现（`index:false,follow:false`）与其策略文档（`noindex,follow`）不一致、AB 用 `noindex,nofollow`——Foundation 以本表为准统一，默认保留 follow 以传递链接权重，仅对高成本垃圾组合关闭 follow。

## 3. Sitemap

- 只收录：Canonical SEO Page、核心实体页（Detail）、类型列表默认视图、达标 Category/Tag hub、Collection。**不收录任何带筛选参数的 URL。**
- 实体级条目来自运行时数据：API Worker 提供内部 `sitemapEntries` 数据源（AB 已有同名 publicProcedure 先例），Web 侧输出 sitemap 路由（`/sitemap.xml` + 分片 `/sitemap-items-*.xml`，单片 ≤ 10k 条）。上游 vite 插件的静态 seed 清单继续负责营销页，两者并存、URL 去重。
- `lastmod` 取 `updated_at`；discovery 关闭时 sitemap 输出与上游基线完全一致（11 号文档验收项）。

## 4. Alias / 301

- slug 变更：Admin `createRedirect` 命令与 slug 更新同事务写入 `alias_redirect`；旧 URL 301 至新 URL。
- 规则：同一 `from_path` 仅一条 active；写入前解析链式重定向至最终目标；禁止环（写入时检测）。
- Web 端在路由 404 前查 alias 表（loader 内单点查询，带缓存）；API 层对 archived + alias 返回 410，Web 层执行 301。

## 5. JSON-LD

上游 `buildSeoHead` 已支持 JSON-LD 注入（PD/PDT 均未做，此为增量价值点）：

- Detail：按 Adapter 声明的 schema.org 类型输出（`CreativeWork` 默认；Novel→`Book`、Movie→`Movie`、Anime→`TVSeries`、Supplement→`Product`），字段由 Presentation Adapter 提供映射。
- 列表/hub：`ItemList`（首屏条目）+ `BreadcrumbList`。
- 结构化数据只输出已发布、可索引页面。

## 6. SEO Page 是编译结果

`discovery_seo_page` 不存任意 JSON：

| 列 | 说明 |
| --- | --- |
| filter_schema_version | 对应 Query AST 版本 |
| canonical_filter_ast | 发布时经完整校验的 AST（type/key/term 全部存在且在白名单内） |
| compiled_path | 发布时生成的静态路径（如 `/novels/completed-fantasy`） |
| robots | 默认 `index,follow` |

发布命令（08 号文档）执行：AST 校验 → 与现有 SEO Page/保留路径冲突检测 → 编译 path → 写入。读取端不做任何 JSON 猜测；AST 版本升级时提供数据迁移或拒绝发布。

## 7. SSR 与 CDN Cache

- 第一页 SSR（硬性原则）；HTML 与 API JSON 分别缓存。
- **API GET**（`/api/discovery/v1/*`）：`Cache-Control: public, s-maxage=300, stale-while-revalidate=600`（列表/taxonomy）；Detail `s-maxage=600`。缓存 key = 规范化 URL（参数白名单 + 排序稳定化由 06 §2 保证）。请求不含 cookie 依赖——轻量上下文设计使其天然可缓存。
- **HTML**：MVP 先不做边缘 HTML 缓存（TanStack Start SSR + 已缓存的 API 已满足首屏预算）；若需要，仅对可索引页面加短 TTL，作为后续优化项。
- facet counts 响应与列表同 key 缓存，容忍 5 分钟陈旧。

## 8. Invalidation

- Cloudflare Free 现已支持 URL、hostname、tag、prefix 与 purge-everything；但 hostname/tag/prefix/purge-everything 的账户级限额为每分钟 5 请求、bucket 25，必须批量和限流。[Cloudflare purge 文档](https://developers.cloudflare.com/cache/how-to/purge-cache/)
- 策略：TTL 仍是安全兜底，不再是唯一失效方式。产品可在真实缓存实现出现后使用 `item:{type}:{id}`、`list:{namespace}` 等 Cache-Tag；大导入优先 prefix/tag purge，精确单页使用 URL purge。
- 失效调用保持可选注入；`directory-lite`/本地环境无 purge 凭证时静默跳过。Foundation 当前只提供测试与接口边界，不预先实现具体 purge client。
