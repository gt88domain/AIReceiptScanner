# Phase 0 — Data Asset Audit

这是资产与身份审计，不是 v5 Schema。所有“projection”都非绑定；不得据此创建共享表或迁移。

## 1. AIBranding

| Table / asset | Schema / migration evidence | PK / unique | slug range | 发布门 / 用途 |
| --- | --- | --- | --- | --- |
| `public_domains` | `aibranding-easystarter@c5e2e37:apps/server/src/db/migrations/0011_aibranding_public_catalogue.sql:1-38` | `id`; `slug UNIQUE` | global domain slug | public iff `is_published=1`, `is_sold=0`, `deleted_at IS NULL`: `aibranding-easystarter@c5e2e37:apps/server/src/modules/aibranding/domains/repository.ts:48-52` |
| `public_domain_categories` | `aibranding-easystarter@c5e2e37:apps/server/src/db/migrations/0011_aibranding_public_catalogue.sql:40-44` | slug PK | category global in this product | Domain category hub |
| `public_brand_ideas`, `public_logo_templates`, `public_design_templates`, `public_figma_templates` | `aibranding-easystarter@c5e2e37:apps/server/src/db/migrations/0011_aibranding_public_catalogue.sql:46-125` | IDs; some slug unique | per table | separate public projections, not one Item model |
| `domain_inquiries`, `domain_daily_views` | `aibranding-easystarter@c5e2e37:apps/server/src/db/migrations/0011_aibranding_public_catalogue.sql:127-145` | inquiry ID; view composite PK | domain slug references logically | commercial/analytics, never Foundation content |
| `user_favorite`, `admin_audit_log` | `aibranding-easystarter@c5e2e37:apps/server/src/db/schema/discovery.ts:5-23`; `aibranding-easystarter@c5e2e37:apps/server/src/db/migrations/0015_aibranding_domain_audit.sql:9-21` | user/type/resource unique; audit ID | resource ID | user interaction/audit |

不可丢：Domain ID/slug/name/price/currency/minimum offer/installment/escrow/published-sold-deleted state; logos/FAQs/brand ideas/use cases; SEO title/description; inquiries; view history; favorite identity; audit version/history. `public_domains` keeps commercial and content fields together (`aibranding-easystarter@c5e2e37:apps/server/src/db/migrations/0011_aibranding_public_catalogue.sql:14-37`), which is why it cannot be projected into a generic table without a product-owned mapping decision.

## 2. Prompt Dir

| Table / asset | Schema evidence | PK / unique | slug range | 发布门 / 用途 |
| --- | --- | --- | --- | --- |
| `discovery_document` | `prompt-dir-next@56a9eed:apps/server/src/db/schema/discovery.ts:11-27` | ID; type/slug index | document-specific | immutable raw source snapshot |
| `discovery_resource` | `prompt-dir-next@56a9eed:apps/server/src/db/schema/discovery.ts:29-59` | ID; slug unique globally | global across resource types | public read projection; type/content/AI/copy/favorite/sponsored fields mixed |
| category/tag/taxonomy and junctions | `prompt-dir-next@56a9eed:apps/server/src/db/schema/discovery.ts:61-128` | category global slug; taxonomy `(key,slug)`; junction composite keys | varies | public filtering/classification |
| collection/source/resource link | `prompt-dir-next@56a9eed:apps/server/src/db/schema/discovery.ts:130-174` | collection/source slug unique; edge keys | global | curation, provenance, external links |

不可丢：resource ID/type/slug; raw JSON; published dates; category/tag/taxonomy links; source content and links; goal; AI rating; copy/favorite counts; sponsored/featured state; collection membership; source records. `goal`, review/media data and assets are read from `raw_json` at `prompt-dir-next@56a9eed:apps/server/src/custom/discovery/public-read.ts:474-512` and `prompt-dir-next@56a9eed:apps/server/src/custom/discovery/public-read.ts:514-606`; JSON may hide references and must be audited before any schema decision.

## 3. url-next — Reference only

| Table / asset | Schema evidence | PK / unique | identity / purpose |
| --- | --- | --- | --- |
| `directory_item` | `url-next@4e3a90e:apps/server/src/db/schema/directory.ts:11-43` | ID; `canonical_slug UNIQUE` | destination URL, root domain, product types JSON, public/sponsored, detail JSON |
| `directory_item_slug_alias` | `url-next@4e3a90e:apps/server/src/db/schema/directory.ts:45-55` | slug PK | historic and canonical item slugs |
| `directory_category` / item-category | `url-next@4e3a90e:apps/server/src/db/schema/directory.ts:57-93` | `(parent_id,slug)` unique | two-level category |
| tag / domain asset / collection | `url-next@4e3a90e:apps/server/src/db/schema/directory.ts:95-170` | product-specific | JSON detail and ranking snapshot are bounded product data |
| blog / site settings | `url-next@4e3a90e:apps/server/src/db/schema/directory.ts:172-210` | separate content | not Foundation evidence |

## 4. Identity and uniqueness risks

| Risk | Evidence | Impact | Phase 0 control |
| --- | --- | --- | --- |
| AIBranding commercial records identify domains by slug | `aibranding-easystarter@c5e2e37:apps/server/src/db/migrations/0011_aibranding_public_catalogue.sql:127-145`; `aibranding-easystarter@c5e2e37:apps/server/src/modules/aibranding/domains/repository.ts:315-332` | P0 commercial/data loss if slug handling changes | Freeze slug and audit all referencing rows before migration |
| Prompt resource slug is global but public path is type-dependent | `prompt-dir-next@56a9eed:apps/server/src/db/schema/discovery.ts:33-53`; `prompt-dir-next@56a9eed:apps/web/src/custom/discovery/resources/prompts/detail-path.ts:23-29` | P0 duplicate or wrong canonical if forced namespace | inventory each type's canonical and legacy route |
| url-next alias table resolves historic slugs | `url-next@4e3a90e:apps/server/src/db/schema/directory.ts:45-55`; `url-next@4e3a90e:apps/server/src/modules/directory/router.ts:264-285` | P1 alias-cycle/canonical regression | reference only; do not generalize table |
| JSON may hide relationships | Prompt `raw_json`; URL Next `detail_json` / collection JSON | P1 missing assets/references | parse-failure and reference inventory before any projection |

## 5. Import and publication facts

| Product | Evidence | finding |
| --- | --- | --- |
| AIBranding | public read gate `aibranding-easystarter@c5e2e37:apps/server/src/modules/aibranding/domains/repository.ts:48-52`; domain audit migration `aibranding-easystarter@c5e2e37:apps/server/src/db/migrations/0015_aibranding_domain_audit.sql:1-21` | Exact import/backfill source not confirmed in this audit; must remain Uncertain. |
| Prompt Dir | raw document comment `prompt-dir-next@56a9eed:apps/server/src/db/schema/discovery.ts:11-14`; Hono projection reads `prompt-dir-next@56a9eed:apps/server/src/custom/discovery/public-read.ts:405-606` | Imported source snapshot plus normalized read projection; public gate is not an explicit status enum in inspected schema. |
| URL Next | schema comment `url-next@4e3a90e:apps/server/src/db/schema/directory.ts:11-12` | Sanity snapshot import is documented in source comment; reference only. |

## 6. Future read-only migration checks

- Row counts by public/private state and resource type.
- Duplicate slug detection, alias resolution/cycle checks, orphan edge checks and JSON parse failures.
- Published records missing canonical fields; commercial rows referencing missing domains; user favorites referencing missing resources.
- Existing sitemap URL count and canonical/status parity.
- Sampled list/detail projection comparison without writes (shadow read only).
