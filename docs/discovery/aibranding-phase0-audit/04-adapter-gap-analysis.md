# AIBranding Phase 0 — Adapter Gap Analysis

## Foundation reuse assessment

| Foundation capability | Prompt Dir evidence | AIBranding evidence | Reuse decision |
| --- | --- | --- | --- |
| Default-empty public-read seam | Real registrar in a downstream composition root | No product registrar yet | Reusable candidate. |
| Static synchronous registration | Prompt registrar is explicit and synchronous | Product can provide an explicit registrar later | Reusable candidate. |
| Route ownership governance | Product route fixtures govern ownership | Existing root dynamic and SEO routes need the same protection | Reusable candidate. |
| Public-read dependency allow-list | Prompt avoids full Context | AIBranding public oRPC reads currently pay full Context | Reusable candidate. |
| Request-lazy read Repository | Proven by Prompt tests | AIBranding repositories are already product-local | Reusable candidate. |
| List/detail DTO | Prompt-specific resource contract | Domain, ideas, logos and design resources have different contracts | Not shared. |
| Pagination/filter helper | Prompt evidence is product-specific | AIBranding has price, extension, prefix/suffix and sale filters | Not shared. |
| SEO metadata generation | Prompt owns its canonical policy | AIBranding owns legacy collection and commercial-detail SEO | Not shared. |
| Rankings, collections, taxonomy | Product-specific | Product-specific and commercially meaningful | Not shared. |

## Adapter gaps

1. **Composition root:** AIBranding's current server is an older direct Hono
   composition. It does not yet consume Foundation's `createApp` seam. A future
   Adapter must be a private downstream composition change, never an upstream
   import of AIBranding.
2. **Transport:** Public reads are currently oRPC procedures behind the generic
   full Context. The Foundation seam is Hono-only. Replacing oRPC is not
   authorized; any future read path must be evaluated as an additive,
   product-owned transport decision with URL/API parity tests.
3. **Multi-resource catalogue:** Domains, ideas, logos, Design MD and Figma
   templates have materially different fields and facets. A universal Resource
   type or generic Card/Detail renderer is not justified.
4. **Commercial adjacency:** A domain detail page is simultaneously a Discovery
   read and a commercial purchase/inquiry surface. The public read boundary may
   expose only the read model; offers, checkout, Turnstile and writes remain
   product services.
5. **Runtime provenance:** Current production Worker/Web versions cannot be
   proven to equal the audited Git `main` SHA. Source evidence is sufficient
   for Phase 0 ownership decisions, not for release validation.

## Conditional recommended Pilot scope

Only after a separately authorized environment decision, a minimal Adapter
Pilot may evaluate one existing **product-owned, anonymous, D1-only read**.
It must prove:

- the AIBranding composition root explicitly supplies one registrar;
- no current public URL, canonical, redirect, sitemap entry, or oRPC procedure
  is removed or reinterpreted;
- a matching request creates no full Context, Auth, Payments, Credits, Jobs,
  Storage or Email service;
- an unmatched generic `/rpc/*` or `/api/*` request preserves its current
  behaviour; and
- no product schema, migration, billing, credits, offer, inquiry, favourite or
  ranking behaviour changes.

## Not authorized

No universal Discovery Item, shared DTO, shared schema/migration, route
namespace, ranking engine, taxonomy engine, Admin/import flow, cache policy,
or AIBranding runtime change is authorized by this audit.

## Phase 0 decision

**Foundation reuse: conditional PASS.** The Foundation has a reusable seam;
AIBranding supplies the second-adapter evidence target. The gaps require a
separate downstream-only Adapter proposal, not a template change.
