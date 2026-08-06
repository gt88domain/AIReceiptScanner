# 05 — Minimal Public-read Contract（最小公共读取合同）

状态：Deferred candidate，非 binding scope，尚未实施。

> 此处是 Phase 0 之前的候选草图。经 [Phase 0 决定](./v5-execution/05-phase0-decision-and-phase1-scope.md)，共享 List/Detail DTO、分页合同和运行时 Adapter 都未取得双下游同构证据；不得按本文新增运行时代码。

Foundation 统一的是公开读取的安全边界与最小程序合同，不是数据库、Hono URL、Query AST 或产品路由。AIBranding 与 Prompt Dir 可在早期继续使用不同的内部表和 HTTP 路径。

---

## 1. 注册与 Context 约束

上游只提供一个受治理的模块 HTTP 注册触点。Discovery 关闭时不得注册路由、导航、sitemap 输入或初始化公开读取服务。

公开读取必须只初始化读取所需依赖；不得调用完整 `createContext()`，不得初始化 Better Auth、Payments、Credits、Storage 或 Admin Context。具体传输可由产品选择 Hono GET、私有 handler 或后续统一 REST；当前不得强制 `/api/discovery/v1/*`。

## 2. 私有 Adapter 的历史候选（不批准）

```ts
type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

interface DiscoveryReadAdapter<TListQuery, TListItem, TDetail> {
  resourceType: string;
  routeNamespace: string;
  validateListQuery(input: unknown): TListQuery;
  list(query: TListQuery): Promise<PaginatedResult<TListItem>>;
  detail(identity: { id?: string; slug?: string }): Promise<TDetail | null>;
  buildCanonicalUrl(item: TDetail): string;
}
```

该接口不是已批准的 Foundation API；它仅保留为未来 ADR 的讨论输入。任何实际合同须重新以两个下游的输入、输出、错误语义、生命周期与测试证明同构。`resourceType` 与 `routeNamespace` 分离仍是路由审计结论，但并不授权新增公开 URL。

## 3. 查询护栏

未来各产品本地实现可考虑：

- 服务端验证公开输入，采用白名单字段/排序；
- 限制 `q` 长度、每页条数、页码和多值参数数量；
- 采用稳定分页，禁止 PDT 的累计 `limit = page * pageSize` 读取；
- 对非法输入返回稳定的 400 错误，不静默忽略筛选；
- 对未发布内容返回不泄露状态的 404。

具体筛选参数、AND/OR、include/exclude、评分排序、facet count 与 cursor 都是 Adapter 私有能力，除非两个实现已证明同构。

## 4. 后置候选

下列项不属于 v5 最小合同：版本化 `/api/discovery/v1/*`、完整 Query AST、Search/Find、Tag/Taxonomy/Collection 端点、Rank 端点、Cursor、self-excluding counts、全局错误信封和共享 DTO 投影。

第二个 Adapter 完成后，对每一项分别比较输入、输出、错误语义、生命周期和测试方式，再决定是否晋升为上游合同。
