# 06 — Route Ownership & Listing Utilities（路由归属与列表工具）

状态：Deferred candidate，非 binding scope，尚未实施。

> [Phase 0 路由审计](./v5-execution/01-route-and-seo-audit.md) 与 [决策](./v5-execution/05-phase0-decision-and-phase1-scope.md) 优先于本文件。当前没有共享 UI、URL-state 或 runtime route utility 获准提取。

Foundation 不创建公开 Web route files，也不注册 `/:type`、`/:type/:slug`、`/:seoPageSlug` 或任何根级动态路由。所有公开 URL 由下游 Adapter 的 route files 拥有。

---

## 1. Route ownership contract

- 每个下游维护 URL inventory：路径、动态段、当前 canonical、sitemap 状态、页面所有者、旧入口与外部依赖。
- Foundation 提供保留段与冲突测试工具，不解释或抢占产品路由。
- `resourceType`（内部单数，如 `domain`）与 `routeNamespace`（公开段，如 `domains`）必须分离；后者可保留历史命名。
- 不把根级 `/:slug` 作为新的 Foundation 能力。根级 SEO Landing 永远是产品私有能力。

AIBranding 已有 `/domains/:slug`、`/category/:slug`、`/rankings/:type`、`/brand-ideas/:slug` 和营销 `/$slug`；Prompt Dir 与 URL Next 也各有多层动态路径。这些不是待统一的错误，而是 Phase 0 需要记录、测试和保护的合同。

## 2. 保留段工具

每个产品的保留段表至少包含 `api`、`rpc`、`auth`、`admin`、`billing`、`blog`、`category`、`ranking`、`rankings`、`search`、`listing`、`templates`、`tools` 等实际存在段。Foundation 工具应断言：

1. 新增动态 namespace 不会吞掉保留段；
2. 同一公开 URL 只有一个 canonical 页面；
3. 路径迁移同时更新 alias/301、canonical、站内链接和 sitemap；
4. Discovery 关闭时，普通 SaaS 路由树保持基线。

## 3. Listing 工具候选，非页面生成器

当前只可把现有 ListingShell、Toolbar、Grid/List 容器、Loading、Error、Empty、Mobile Filter Drawer、Selected Filter Chips、URL-state 辅助函数作为候选证据。除非两个 Adapter 的交互语义和视觉回归基线完成比较，不得提取或增加共享 API。

必须留在下游：route file、Card、详情页、Facet 控件/字段、排行榜行、SEO 正文、JSON-LD 和视觉语言。Gallery/Catalog/Feed 只能是可选布局助手，不能成为强制 Adapter 注册协议。

## 4. SEO 与迁移

首次重建保留每个产品当前 canonical。只有 URL inventory、backlink/index 审计、301 map、sitemap parity 和页面回归都通过后，产品才可自行选择新的 canonical；Foundation 不宣布 `/prompts/:slug`、`/rankings/:key` 或任何其他路径为全局标准。
