# Discovery v5 — Foundation acceptance

Date: 2026-08-10

## Decision

The Discovery v5 **Foundation** is accepted as an architectural baseline. This
is an evidence decision, not a product cutover or a semantic-version release:
the current published EasyStarter release remains `v0.4.12`.

The accepted Foundation is deliberately thin:

- public route-ownership governance;
- an anonymous public-read dependency allow-list;
- an explicit, synchronous public-read registrar seam; and
- an immutable default-empty registrar list, preserving the stock template
  surface when Discovery is unused.

It does not own a product URL, schema, migration, resource type, card, detail
page, filters, rankings, collection model, import process, SEO copy, or
commercial workflow.

## Upstream evidence

| Evidence | Result |
| --- | --- |
| Phase 1A route claim identity | accepted: duplicate identity is route pattern inside one product fixture only |
| Phase 1B dependency allow-list | accepted: D1, pure product read repository, public-safe product config, request log, request id only |
| Phase 1C registration governance | accepted: explicit Hono-owned, request-lazy, GET/HEAD future registration contract |
| Phase 1D runtime seam | accepted: synchronous `undefined`-returning registrar before generic RPC/API handling; default list is empty |
| Profile safety | accepted: full-saas, account-app, directory, and directory-lite retain their unchanged default surface |
| Current upstream baseline | `4dc3f180ea0bf2cccf94482fb48ac9c27d50be18` on `main`, released as `v0.4.12` at `9915a64` |

The governing details remain in [Phase 1A](./07-phase1a-route-ownership-governance.md),
[Phase 1B](./08-phase1b-public-read-dependency-allow-list.md),
[Phase 1C](./09-phase1c-public-read-registration-extension-point.md), and
[Phase 1D](./10-phase1d-default-empty-runtime-extension-point.md).

## Downstream evidence

| Product | Role | Evidence | Counts toward Foundation acceptance? |
| --- | --- | --- | --- |
| Prompt Dir | first content-directory pilot | private synchronous registrar + product-owned D1/repository + isolated Preview reconciliation and public-read validation; main `6b9f28c1f93c62dc354fff8b450717990992bd03` | yes |
| AIBranding v5 | second, commercial-directory read pilot | a clean downstream product owns its private catalog D1/schema/UI; five public read catalogues and a separate Preview Web contract pass; released `v0.8.4` at `048acba4b8b17440783b84122b505f99ed1bc2ab` | yes |
| URL Next | third directory candidate | not yet adapted or used to promote a capability | no |

AIBranding demonstrates that the seam coexists with a product that may later
add commercial workflows. It does **not** promote Domain, pricing, offers,
inquiries, favorites, payments, or admin data into Foundation.

## Boundary decision

Explorer UI remains product-local. Prompt Dir and AIBranding both have
directory-shaped pages, but their cards, filters, categories, SEO rules, and
resource semantics differ. No UI component, generic resource schema, filter
configuration engine, or catalog database abstraction has the required
three-product evidence to move upstream.

The promotion rule is unchanged: consider an upstream extraction only when the
same behavior and substantially the same props have been independently proven
in all three downstream products. Two similar implementations are evidence for
product-local reuse, not Foundation code.

## What this acceptance does not authorize

- AIBranding production deployment, DNS change, traffic cutover, production
  D1/R2 mutation, or a production migration.
- AIBranding purchase/inquiry/admin writes. Those require a separate design,
  threat model, provider decision, and focused money/write-path tests.
- URL Next runtime adaptation.
- A shared Discovery DTO, schema, migration, public Web route, ranking engine,
  canonical policy, or UI kit.

## Next decisions

1. Keep upstream in maintenance mode while product-local work continues.
2. Treat AIBranding's remaining production-cutover work as product work, not
   Foundation work.
3. Start the URL Next audit/pilot only after its product scope is chosen; it is
   not a prerequisite for this Foundation acceptance.
4. Choose a future version label explicitly. This document deliberately does
   not infer whether the architectural milestone should be released as `0.5.0`,
   `5.0.0`, or only documented under the existing release line.
