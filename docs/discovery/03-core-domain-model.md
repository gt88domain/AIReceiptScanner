# 03 — Candidate Domain Model（候选领域模型）

状态：Deferred candidate，非绑定设计，尚未实施。

本文件保留未来共享 Schema 的思考素材；它**不是** v5 Phase 0–4 的实现清单，也不授权创建表、迁移、公开路由或数据回填。只有 AIBranding 与 Prompt Dir 的私有 Adapter 已证明同构需求后，才可将其中的任一项升级为 ADR 和独立 PR。

---

## 1. 三个身份必须分离

```ts
type ResourceType = "domain" | "prompt" | "logo" | "design";
type RouteNamespace = "domains" | "prompts" | "logos" | "designs";
type VerticalKey = string;

type AdapterIdentity = {
  resourceType: ResourceType;      // 内部领域类型，通常用单数
  routeNamespace: RouteNamespace;  // 产品公开路径，可保留历史复数或品牌名
  verticalKey: VerticalKey;         // 产品/Adapter 归属，不能从前两者推断
};
```

不得把 `resourceType`、`routeNamespace`、`verticalKey` 合并为一个字段。AIBranding 的 `/domains/:slug` 与 Prompt Dir 的历史路径都说明：内部身份稳定，不代表公开 URL 必须统一。

## 2. 当前已证实的最小公共形状

两个下游都需要“公开发布资源的列表与详情读取”，但尚未证明应共用表。当前只把以下形状视为候选 DTO，不约束物理列：

```ts
type ResourceIdentity = {
  resourceType: string;
  id: string;
};

type ListItem = {
  id: string;
  title: string;
  canonicalUrl: string;
};

type DetailItem = ListItem & Record<string, unknown>;
```

价格、售卖状态、Prompt 内容、复制数、AI Rating、分类层级、来源、收藏和商业流程均保持下游私有，直到两个 Adapter 证明其输入、输出、错误语义、生命周期与测试方式确实一致。

## 3. 候选能力，全部后置

下列模型可以作为未来 ADR 的起点，当前不承诺其名称、主键、表数、路由或 Migration：

| 候选 | 当前证据 | 升级前必须补齐 |
| --- | --- | --- |
| `discovery_item` | 两边都有资源详情 | 同一发布生命周期与唯一性模型 |
| Category / Tag / Taxonomy | 两边都有分类/筛选 | 同一层级、归属和 URL 语义 |
| Source / ItemSource | Prompt 明确需要 | AIBranding 同构来源/外部 ID 需求 |
| Alias | 三项目都有路径演进风险 | 统一 alias 生命周期与切流要求 |
| Ranking | 两边都有榜单页面 | 同一输入、排序、刷新与缓存语义 |
| Collection / Relation / Update | 单方或参考需求 | 第二个真实产品证据 |

## 4. 不能被候选模型吸收的内容

- AIBranding 的 Domain、价格、最低报价、分期、Escrow、出售状态、Inquiry、Offer、View 与收藏。
- Prompt Dir 的内容、复制、平台、用途、AI Rating、安全标签与导入原始记录。
- `url-next` 的 destination URL、root domain、两级 category、资产和 collection snapshot。
- 产品自己的公开 URL、页面布局、Card、Facet 组合、SEO 正文与 JSON-LD。

## 5. 升级门槛

“两边都有同名功能”不构成证据。只有输入、输出、错误语义、生命周期和测试方式均基本同构时，才能以 ADR 提出共享模型；否则保持两个私有 Adapter，Foundation 只共享合同与测试工具。
