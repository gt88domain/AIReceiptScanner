# MySaaS Page Targets

This document turns the AI SaaS Factory idea into a long-term page inventory for
EasyStarter-based products.

It is a target map, not an implementation plan. Do not add every page at once.
Most pages here are a parking lot until a real converted site needs them. The
active evolution process is in `docs/mysaas-template-evolution.md`.

## Current EasyStarter Coverage

Current web routes already present in this copy:

- `/`
- `/blog`
- `/blog/:slug`
- `/blog/category/:slug`
- `/docs/*`
- `/terms`
- `/privacy`
- `/auth/sign-in`
- `/auth/sign-up`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/phone-verify`
- `/dashboard`
- `/users`
- `/settings/profile`
- `/settings/security`
- `/settings/billing`
- `/credits/purchase`
- `/credits/transactions`
- `/billing`
- `/billing/success`
- `/billing/cancel`

EasyStarter already covers the base SaaS shell:

- marketing home
- blog/docs/legal content
- authentication
- dashboard shell
- user list
- settings profile/security/billing
- billing flow
- credits purchase/history

## Page Strategy

The long-term template should be organized as:

```txt
Core SaaS pages
+
AI product workspace pages
+
Optional discovery/directory pages
+
Optional growth/enterprise pages
```

The template should not become a CRM, forum, email marketing suite, or full
marketplace platform. Those belong as plugins or product-specific modules.

## Core SaaS Pages

These are useful for most projects.

| Page group | Status | Target routes |
| --- | --- | --- |
| Marketing home | present | `/` |
| Blog/docs/legal | present | `/blog`, `/docs/*`, `/terms`, `/privacy` |
| Auth | present with EasyStarter naming | `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/reset-password` |
| Dashboard | present | `/dashboard` |
| Settings profile/security/billing | present | `/settings/profile`, `/settings/security`, `/settings/billing` |
| Billing success/cancel | present | `/billing/success`, `/billing/cancel` |
| Credits purchase/history | present | `/credits/purchase`, `/credits/transactions` |
| Standalone marketing pages | missing | `/features`, `/pricing`, `/faq`, `/contact` |
| SEO marketing pages | missing | `/examples`, `/use-cases`, `/customers`, `/changelog` |
| Onboarding | missing | `/onboarding` |
| Projects | missing | `/projects`, `/projects/:id` |
| Assets | missing | `/assets` |
| Usage | missing | `/usage` |
| Notifications settings | missing | `/settings/notifications` |
| Privacy account settings | partial | `/settings/privacy` |

Recommendation:

- Keep EasyStarter auth routes as canonical for now.
- Add `/login` and `/register` aliases only if a product needs simpler public
  URLs.
- Add `/pricing` as a standalone page only if the landing pricing section is not
  enough.

## AI SaaS OS Pages

These pages make the template different from a generic SaaS starter.

| Page | Priority | Target route | Notes |
| --- | --- | --- | --- |
| Projects | V1 | `/projects`, `/projects/:id` | Generic workspace container for AI products |
| Assets | V1 | `/assets` | Images, video, audio, documents, generated outputs |
| Usage | V1 | `/usage` | Credits, API calls, generation cost, monthly limits |
| Generation history | V2 | `/history` | Prompt, model, cost, output, timestamp |
| Models | V2 | `/models` | User-facing model/provider preference, not provider secret admin |
| Jobs/Queue | V2 | `/jobs` | Long-running generation status, retries, failures |
| Prompt library | V2 | `/prompts` | Saved prompts and templates |
| Template marketplace | V2/V3 | `/templates` | Free/premium templates; do not add marketplace payments early |
| Workflows | V3 | `/workflows` | Agent/workflow builder; defer until real product demand |

V1 generic data concepts:

- project
- asset
- usage event
- generation record
- job

Do not implement all five as one mega-module. Start with Projects + Assets or
Usage, depending on the first real product.

## Discovery / Directory Pages

Detailed spec:

- `docs/mysaas-discovery-module-spec.md`

Target routes:

- `/discover`
- `/category/:slug`
- `/tag/:slug`
- `/collection/:slug`
- `/best/:slug`
- `/rank/:slug`
- `/:type/:slug`

Use `/category/:slug`, not `/discover/category/:slug`.

Tag SEO rule:

- `publishedItemCount <= 5`: `noindex, follow`
- `publishedItemCount > 5`: indexable when otherwise valid

Discovery should be optional and disabled for simple SaaS products.

## Developer / API Pages

Useful for API products and platform products.

| Page | Priority | Target route | Notes |
| --- | --- | --- | --- |
| Developers overview | V2 | `/developers` | Public or authed landing for API users |
| API keys | V2 | `/developers/api-keys` | Show-once key, hashed secret, revoke, last used |
| API docs | already docs-capable | `/docs/api` | Prefer docs content before custom UI |
| Rate limits | V2 | `/developers/rate-limits` | Can start as docs |
| Webhooks | later | `/developers/webhooks` | Only when product exposes webhooks |

## Team / Organization Pages

Do not add these before a product needs team billing or collaboration.

| Page | Priority | Target route |
| --- | --- | --- |
| Team members | V3 | `/team` |
| Invitations | V3 | `/team/invitations` |
| Organization settings | V3 | `/organization/settings` |
| Roles | V3 | `/team/roles` |

RBAC is not required before this stage. A minimal admin allowlist is enough for
early internal admin pages.

## Admin / Operations Pages

Admin pages are useful, but they should not block early product work.

| Page | Priority | Target route | Notes |
| --- | --- | --- | --- |
| Admin home | V1/V2 | `/admin` | Internal ops summary |
| Users | partial | current `/users`; future `/admin/users` | Current page is dashboard user list |
| Revenue | V2 | `/admin/revenue` | Stripe/Creem summaries |
| Subscriptions | V2 | `/admin/subscriptions` | Read-only first |
| Logs | V2 | `/admin/logs` | App/audit logs |
| Reports | V3 | `/admin/reports` | Defer |
| Feature flags | V3 | `/admin/feature-flags` | Defer unless needed |
| Analytics | V2/V3 | `/admin/analytics` or `/analytics` | Decide public/internal meaning |

Do not add full RBAC now. If admin pages are added early, protect them with the
smallest server-side admin gate.

## Support Pages

Prefer content first.

| Page | Priority | Target route |
| --- | --- | --- |
| Support landing | V2 | `/support` |
| Contact | V1/V2 | `/contact` |
| FAQ | V1/V2 | `/faq` |
| Tickets | V3/plugin | `/support/tickets` |

Do not build a ticketing system early.

## Layout Targets

The long-term template should have these layout concepts:

- `MarketingLayout`
- `DashboardLayout`
- `AdminLayout`
- optional `DiscoveryLayout`
- optional `DeveloperLayout`

Do not create new layout abstractions until at least two real pages need them.

## Component Targets

Reusable components worth standardizing:

- data table with search/filter/pagination/sort
- empty state
- file upload and preview
- resource card protocol for discovery
- usage meter widgets
- project picker
- asset grid/list
- job status indicator
- in-app notification list

Do not add a component library rewrite. Reuse EasyStarter/shadcn components.

## Pages To Avoid Early

Avoid adding these to the base template:

- CRM
- forum
- chat/community
- full CMS admin
- email marketing
- affiliate system
- marketplace payment split
- ticketing system
- workflow builder before a real workflow product exists

These should be optional plugins or product-specific modules.

## Priority Roadmap

### V1: Core AI SaaS Factory

- keep current EasyStarter auth/billing/settings/credits
- add Projects
- add Assets
- add Usage
- add minimal Admin or admin gate only if needed
- add standalone `/pricing` only if landing pricing is insufficient
- add `/onboarding` for product personalization

### V2: AI Product Layer

- Generation History
- Models
- Jobs/Queue
- API Keys
- Prompt Library
- Discovery first slice for directory products

### V3: Growth / Enterprise

- Team
- Organization
- Invitations
- Role management
- Marketplace templates
- Workflow builder
- Admin analytics/reports

## Planning Prompt

Use this prompt for the planning AI before implementation.

```text
You are planning long-term page targets for an EasyStarter-based AI SaaS
Factory template.

Read:
- docs/mysaas-extension-brief.md
- docs/mysaas-page-targets.md
- docs/mysaas-discovery-module-spec.md
- apps/web/src/routes
- apps/web/src/configs/data/sidebar-data.ts
- apps/server/src/routers/index.ts

Goal:
Produce an implementation roadmap that keeps EasyStarter close to upstream while
adding reusable AI SaaS business pages.

Hard constraints:
- Do not rewrite auth, billing, credits, or payment providers.
- Do not add all pages at once.
- Prefer custom module directories and small route/router/nav/config touch
  points.
- Keep Discovery optional and disabled unless a site needs it.
- Do not add full RBAC before team/admin scope requires it.
- Use EasyStarter routes as-is unless an alias is clearly valuable.
- Every non-trivial slice must include one runnable check.

Output:
1. Current page coverage summary.
2. Pages to add in V1, V2, V3.
3. First implementation slice.
4. Exact EasyStarter files likely touched.
5. New custom directories/files likely added.
6. Pages intentionally deferred.
7. Upstream merge risk.
8. Verification plan.
```
