# 09 — Private Adapter Contract（私有 Adapter 合同）

状态：v5 binding scope（最小合同）。

Adapter 首先是每个下游自己的实现边界，不是强制注册完整通用目录系统的插件。Foundation 只依赖最小公开读取能力；Presentation、Schema、导入、Ranking 与 SEO 均留在下游。

```ts
interface DiscoveryReadAdapter<TListQuery, TListItem, TDetail> {
  resourceType: string;       // 内部领域身份，例如 "domain" 或 "prompt"
  routeNamespace: string;     // 当前产品 URL，例如 "domains"；不得据此改历史路径
  validateListQuery(input: unknown): TListQuery;
  list(query: TListQuery): Promise<PaginatedResult<TListItem>>;
  detail(identity: { id?: string; slug?: string }): Promise<TDetail | null>;
  buildCanonicalUrl(item: TDetail): string;
}
```

## 下游私有责任

- AIBranding：`public_domains` 等领域表、价格/后缀/长度/出售状态筛选、Domain Card/Detail、Offer/Inquiry/Favorite、排行榜算法、导入和现有 URL。
- Prompt Dir：现有 discovery 表、Prompt 内容/复制/平台/用途/AI Rating、Prompt Card/Detail、筛选、导入和现有 URL。
- URL Next：只作为路由、alias 和两级分类参考；不参加第一批 Schema 或 Adapter 强制要求。

## 明确后置

不在 v5 最小合同中定义 `taxonomyKeys`、`sortFields`、`listProjection`、relation/update、`loadExtension`、`normalizeImportRecord`、JSON-LD、React Card/Row/DetailBody、facet groups、URL→AST、Ranking 存储或公开 API URL。

某项能力只有在两个私有 Adapter 的输入、输出、错误语义、生命周期和测试方式都同构时，才能以独立 ADR 晋升；“两个产品都有同名页面/排行榜/分类”并不构成充分证据。
