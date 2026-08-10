# AIBranding Phase 0 — Public-read Boundary

## Foundation contract

Foundation's accepted public-read seam is intentionally narrow:

- explicit, synchronous, downstream-owned Hono registrar;
- mounted before the generic RPC/API catch-all;
- request-lazy initialization only;
- allowed dependencies: D1, a read-only product Repository, a public-safe
  product-config projection, request logging, and request ID; and
- no default product routes in stock EasyStarter.

It must not initialize or require Auth session, Payments, Credits,
Entitlements, Jobs, user Storage, or write-oriented Email/notification
services.

## Current AIBranding evidence

Current AIBranding does **not** use that seam. Its `/rpc/*` middleware creates
the full `createContext()` before every matched procedure. Therefore its public
oRPC reads currently travel through the same broad Context family as account
and payment routes.

The product repositories for the catalogue reads use D1 and do not themselves
need user identity, payments, credits, jobs, or Storage authorization. Domain
records contain public R2 URLs, but these reads do not call an R2 service.

| Procedure family | Product read dependencies | Current transport behaviour | Future seam fitness |
| --- | --- | --- | --- |
| `aibranding.home` | D1 + public catalogue repositories | Full `createContext()` via `/rpc/*` | Candidate |
| `aibranding.domains` | D1 + public domain repository | Full `createContext()` via `/rpc/*` | Candidate |
| `aibranding.domainDetail` | D1 + related-domain reads | Full `createContext()` via `/rpc/*` | Candidate |
| `category`, `staticDomainList`, `staticDomainFacet` | D1 + domain taxonomy/facets | Full `createContext()` via `/rpc/*` | Candidate |
| `brandIdeas`, `logos`, `designs`, `figmaTemplates`, `rankings`, `sitemapEntries` | D1 + product-specific read repositories | Full `createContext()` via `/rpc/*` | Candidate, separately assessed per DTO/cache contract |
| `favoriteResources` | D1 read, caller-selected identifiers | Full `createContext()` via `/rpc/*` | Product-specific; do not assume it belongs in a first read slice |
| `recordClick`, `recordDomainView` | D1 write | Full `createContext()` | Not public-read seam scope |
| `inquiries.checkoutIntent`, `inquiries.submit` | Commercial policy, Turnstile and D1 write | Full `createContext()` | Not seam scope |
| `favorites.merge/remove`, Admin, billing, credits | User/session or commercial mutation | Full Context | Never public-read seam scope |

## Prompt Dir comparison

Prompt Dir is the first proven downstream reference: its explicit
`registerPromptDiscoveryRoutes` registrar mounts a private Hono router before
the generic API context and handles public Discovery reads without calling the
full Context. Its routes, D1 schema, DTOs, canonical policy, and hidden-resource
behaviour remain Prompt Dir-owned.

That proves the Foundation seam, not that AIBranding can share Prompt Dir's
transport, DTOs, pagination, taxonomy, SEO policy, or Schema.

## Phase 0 decision

**PASS for candidate identification; runtime remains No-Go.** The AIBranding
catalogue has real candidate reads, but an Adapter must first preserve the
existing oRPC and public URL contracts and prove zero full-Context calls for
only an explicitly scoped future read path.
