# MySaaS Extension Brief

This document prepares future planning work on top of EasyStarter.

The default strategy is to keep EasyStarter close to upstream and add MySaaS
business modules as a thin extension layer. Do not port the old template module
tree back into EasyStarter.

Related planning docs:

- `docs/mysaas-ai-handoff-rules.md`
- `docs/mysaas-template-evolution.md`
- `docs/mysaas-site-migration-playbook.md`
- `docs/mysaas-public-read-model-migration.md`
- `docs/mysaas-page-targets.md`
- `docs/mysaas-discovery-module-spec.md`

## Current Decision

- Use EasyStarter as the base product template.
- Do not run the official Prompt 1 yet.
- Do not modify EasyStarter core modules unless a module has no clean extension
  point.
- Treat old MySaaS code as archived implementation experience, not as code to
  copy.
- Defer RBAC for now.

## Boundary Checks

The "web must not touch D1 or secrets" rule is not a one-time setup check.

Run it whenever code changes touch one of these areas:

- `apps/web`
- `apps/server`
- `packages/api-client`
- `packages/app-config`
- `wrangler.jsonc`
- environment variable handling

Reason: the risk is regression. A future feature can accidentally import server
code into web, add a D1 binding to the web Worker, or expose server-only env
names. A cheap static check is useful because it protects an invariant that is
easy to break during AI-assisted edits.

For now this can stay as a planning item. Do not add a script until the project
starts receiving code changes beyond docs.

## Upstream-Safe Extension Model

Preferred layout for custom modules:

```txt
apps/server/src/custom/
apps/web/src/custom/
packages/site-modules/
```

Allowed core touch points should stay small:

- server router registration
- web route registration
- dashboard/nav entry
- config export

Avoid changing these unless required:

- Better Auth setup
- payment provider internals
- credits ledger internals
- shared EasyStarter UI primitives
- existing app-config payment semantics

If a custom module needs billing or credits, call the existing public service or
API surface. Do not fork the billing/credits implementation.

## Modules To Add

### 1. Discovery/Search

Priority: high.

Why: several target sites need directory, comparison, listing, and SEO entry
pages. EasyStarter has blog/docs search, but not a domain resource discovery
system.

Detailed product and planning spec:

- `docs/mysaas-discovery-module-spec.md`

Minimum useful version:

- resource schema owned by the custom module
- public list page
- category/tag pages
- item detail page
- simple admin/content seed path
- no external search service at first

Suggested first routes:

- `/discover`
- `/category/:slug`
- `/tag/:slug`
- `/:type/:slug`

### 2. SEO Aggregation Pages

Priority: high after Discovery.

Why: target AI directory/product sites need long-tail pages such as "best X",
"X for Y", and comparison/collection pages.

Minimum useful version:

- collection pages
- rank pages
- sitemap coverage
- canonical/noindex policy
- internal-link rules

Keep this mostly configuration-driven so each copied site can add pages without
editing EasyStarter core.

### 3. AI Gateway Adapter

Priority: medium-high.

Why: target products are AI SaaS sites. EasyStarter is a general SaaS template;
it does not provide a first-class AI provider gateway, model allowlist, or usage
cost tracking.

Minimum useful version:

- one provider first
- server-only API key handling
- model allowlist
- one generation endpoint
- optional credit consumption through existing credits API

Do not build async jobs until a real product flow needs them.

### 4. Usage Meter

Priority: medium.

Why: useful once AI calls exist. It should record cost, latency, model, provider,
status, and user.

Minimum useful version:

- append-only usage records
- own usage history
- simple admin CSV/list view later
- no rollups until query speed proves a need

### 5. API Keys

Priority: medium-low.

Why: useful for API products, but not needed for basic web SaaS launch.

Minimum useful version:

- user-created key
- hashed secret storage
- show-once secret
- revoke
- last-used timestamp

### 6. Invitations

Priority: low unless team accounts are required.

Why: useful for B2B/team products, unnecessary for solo-user AI tools.

Minimum useful version:

- email invite
- accept invite
- revoke pending invite

Do not add full organization/multi-tenant logic unless a product explicitly
needs teams.

## Modules Not Needed Yet

### RBAC

RBAC means role-based access control: permissions such as `admin` versus normal
`user`.

Do not add full RBAC now.

Reason: it cuts across auth, user APIs, admin pages, and tests. That makes
future EasyStarter upstream merges harder. For the current stage, a small
server-side admin gate is enough if an admin-only page is introduced.

Upgrade path:

1. Start with one hard admin allowlist or one `isAdmin` check.
2. Add role tables only when there are multiple admins, support staff, or scoped
   permissions.
3. Add full RBAC only when the product needs role assignment UI.

## Pages Missing Versus Old MySaaS Plan

EasyStarter already has:

- landing page
- auth pages
- dashboard shell
- profile/settings pages
- billing pages
- credits pages
- docs/blog content pages
- native profile and payment-related screens

Old MySaaS planned pages that EasyStarter does not fully cover:

- discovery home
- searchable resource list
- category pages
- tag pages
- collection pages
- rank/best pages
- resource detail pages
- discovery admin CRUD pages
- AI generation page
- AI usage history page
- admin usage/cost view
- API key management page
- invitation management page
- audit log page
- operational settings pages
- billing event replay/admin billing event list

Do not implement all at once. Discovery/Search and SEO Aggregation are the first
real gaps for the target site portfolio.

## Old Code Deletion Decision

The old root `apps/`, `packages/`, and module implementation files can be
deleted after any still-useful docs are preserved.

Keep as experience, not code:

- D1 batch behavior: zero-row conditional updates do not abort a batch.
- Money-path writes need idempotency and a runnable regression check.
- Web/server boundary should stay checked during future edits.
- Copy-per-site templates need a template version and clear upstream update
  discipline.
- Discovery page taxonomy is valuable as product planning input.

Do not keep:

- the old staged execution plan as the active plan
- the old module file template
- old Hono REST contract code if EasyStarter keeps oRPC
- old billing/credits implementation

## Relative Quality Estimate

EasyStarter is better overall for the current goal.

Approximate comparison:

| Area | Better base | Estimate | Qualitative result |
| --- | --- | ---: | --- |
| Fast SaaS launch | EasyStarter | +70% | qualitative upgrade |
| Auth/UI/dashboard | EasyStarter | +60% | qualitative upgrade |
| Cross-platform payment | EasyStarter | +100% | qualitative upgrade |
| Native readiness | EasyStarter | +100% | qualitative upgrade |
| AI-specific product modules | Old plan docs | +30% | useful requirements, not implementation |
| D1 money-path caution | Old plan docs | +25% | useful checks, not enough to replace code |
| Template update discipline | Old plan docs | +20% | process improvement |
| Implementation simplicity | EasyStarter | +50% | keep upstream |

Only the payment/native/product-template coverage is a true qualitative win.
The old plan's advantages are mostly guardrails and product requirements.

## Planning Prompt For The Next AI

Use this brief before writing any implementation plan.

Planning constraints:

- Keep EasyStarter close to upstream.
- Prefer custom extension modules over core edits.
- Start from Discovery/Search and SEO Aggregation.
- Do not add RBAC unless an admin workflow truly needs scoped roles.
- Do not rewrite billing or credits.
- Convert old MySaaS files into lessons and requirements only.
- Every non-trivial new module must leave one small runnable check.

First planning output should include:

- selected first module
- exact core touch points
- files to add
- files to avoid modifying
- data tables, if any
- one verification command
- rollback plan
