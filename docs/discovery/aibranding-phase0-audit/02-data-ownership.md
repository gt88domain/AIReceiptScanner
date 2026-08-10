# AIBranding Phase 0 — Data Ownership

## Decision

Foundation owns generic platform capability, not AIBranding catalogue or
commercial data. No AIBranding table is approved to move into a shared
Discovery Schema.

## Ownership matrix

| Model or table | Current role | Owner | Foundation conclusion |
| --- | --- | --- | --- |
| `public_domains` | Domain inventory, publication, price, SEO, logos, purchase availability | AIBranding | Product-private. |
| `public_domain_categories` | Domain category labels and cached counts | AIBranding | Product-private. |
| `tag_slugs_json` on `public_domains` | Domain tags | AIBranding | There is no tag table to generalize. |
| `public_brand_ideas` | Brand-name ideas and click signals | AIBranding | Product-private. |
| `public_logo_templates` | Logo directions and click signals | AIBranding | Product-private. |
| `public_design_templates` | Design MD content and facets | AIBranding | Product-private. |
| `public_figma_templates` | Figma catalogue | AIBranding | Product-private. |
| Ranking | Computed from domain views and resource click counts | AIBranding | No ranking table or algorithm belongs upstream. |
| `domain_daily_views` | Product ranking signal with viewer hash | AIBranding | Product analytics; not shared. |
| `domain_inquiries` | Offer amount, buyer email/message, status and admin notes | AIBranding | Commercial private data. No separate offer table exists. |
| `user_favorite` | Account-backed shortlist entries | AIBranding | Product-owned persistence using Foundation identity. |
| `user`, `account`, `session`, `verification`, `rateLimit` | Authentication/session data | Foundation | Remain platform-owned. |
| `billing_*` | Provider customers, checkout, purchases, subscriptions and verified events | Foundation | Remain platform-owned; domain transactions do not become generic billing data. |
| `credit_*`, `billable_operation` | Credit ledger, orders and product operation authorization | Foundation | Remain platform-owned; no AIBranding domain-price field belongs here. |
| R2 bucket `aibrand` | Existing domain-logo objects | AIBranding | Product asset inventory and URLs remain downstream-owned. |

## Current schema evidence

The audited production D1 ledger contains AIBranding migration files
`0011_aibranding_public_catalogue.sql` through
`0016_better_auth_rate_limit.sql`. The live catalogue contains the AIBranding
tables above, including `public_domains`, `public_domain_categories`,
`domain_inquiries`, and `user_favorite`.

The AIBranding catalogue is intentionally not a Foundation Drizzle domain
model: its catalogue tables are created by downstream SQL migrations and read
through product repositories. This is compatible with the Foundation rule that
the API Worker owns D1, but it is not evidence for shared product Schema.

## Explicit commercial boundary

The following must remain product-private even if a future read Adapter is
successful:

- `price`, `currency`, minimum offer, discounts, sale and publication state;
- escrow providers, buy-now and installment options;
- inquiry email, message, admin notes and lifecycle;
- domain-specific ranking signals and algorithms;
- favourite resource types and identifiers; and
- product SEO copy, logos, ideas, templates and taxonomy semantics.

## Phase 0 decision

**PASS for ownership evidence.** A later Adapter may consume product-owned
read repositories through the Foundation seam. It may not create a shared
catalogue table, migration, ranking model, tag model, offer model, or inquiry
model.
