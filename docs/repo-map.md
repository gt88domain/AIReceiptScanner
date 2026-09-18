# Repository map

This is the maintained navigation map for EasyStarter. It maps change intent to
ownership and entry points; it does not duplicate every file or symbol.

For runtime relationships and lifecycles, see
[Architecture map and critical sequences](./architecture-map.md). For enforced
machine facts, use `template-kit/repository-facts.json`.

## Runtime entry points

| Runtime | Entry point | Owns | Does not own |
| --- | --- | --- | --- |
| Web Worker | `apps/web/src/server.ts` | TanStack Start SSR, public/authenticated UI, SEO, browser-facing API mediation | Business D1, payment/provider secrets |
| API Worker HTTP | `apps/server/src/index.ts` → `app/create-app.ts` | Hono routes, Better Auth boundary, oRPC, business services | Product UI |
| API Worker Queue/Cron | `apps/server/src/index.ts` → `worker/create-worker-handlers.ts` | Jobs, DLQ ingestion, webhook recovery, billing outbox, maintenance | Long-lived sleeping workflows |
| Optional mobile | `optional/mobile/app/_layout.tsx` | Expo Router app and native client integrations | Server business data or Web UI |

The API Worker is the sole business-data owner. Web SSR uses `API_SERVICE` when
available; browser and mobile clients use HTTPS oRPC.

## Change map

| Change intent | Start here | Usually also read |
| --- | --- | --- |
| Product identity, auth choices, email, storage, credit packages | `packages/app-config/src/product-config.ts` and product-owned sibling files | `docs/config-architecture.md` |
| Public feature switches, routes, theme preset | `packages/app-config/src/public-runtime.ts` | `packages/app-config/src/features.ts` |
| Starter landing page and public navigation | `apps/web/src/components/landing-page`, `apps/web/src/components/layout/tailark` | `_public/route.tsx` owns the single Header/Footer shell; semantic skin tokens live in `styles/index.css` |
| Product listing, ranking, or detail page | Product module under `apps/web/src/modules/<domain>` using `components/ui` and `components/public` | `docs/golden-paths/directory.md`; product owns data, URLs, SEO, filters, cards, and copy |
| Inspect shared public components | Dev/preview-only `/design-system` route | `apps/web/src/components/design-system`, `wrangler.preview.jsonc`; production returns 404 |
| Membership tiers and presentation semantics | `packages/app-config/src/membership-config.ts` | `apps/server/src/payments/domain/policy.ts` |
| Provider price catalog and platform-specific payment policy | `packages/app-config/src/app-config.ts` | `apps/server/src/payments/providers` |
| New Web product domain | `apps/web/src/modules/<domain>` | Thin route under `apps/web/src/routes` |
| New Server product domain | `apps/server/src/modules/<domain>` | `apps/server/src/modules/README.md`, router registration in `modules/index.ts` |
| New table or index | `apps/server/src/db/schema/<domain>.ts` | `apps/server/src/db/README.md`, immutable migration under `db/migrations` |
| Auth/session behavior | `apps/server/src/auth/adapter.ts`, `apps/server/src/lib/auth.ts` | `apps/server/src/auth/README.md`, standard guards |
| Paid capability | Product capability configuration | `modules/capabilities`, verified billing status, `requireCapability` |
| Checkout, subscription, purchase, webhook | `apps/server/src/payments` | `docs/cross-platform-payment-test-scenarios.md` |
| Credit grant, consumption, refund | `apps/server/src/credits` | `docs/billable-operations.md` |
| Retryable background work | Product handler + `modules/jobs` registry | `docs/async-reliability.md`, Jobs Golden Path |
| Product file | `modules/assets` service + domain policy | `docs/storage-optional.md`; never authorize with a raw key |
| Admin-only operation | Server admin procedure + standard guard | `docs/admin-access.md`, audit service when mutation is material |
| Public copy or translations | `packages/i18n/src/messages/<surface>` | `docs/i18n-implementation.md` |
| Blog/docs content | `apps/web/content` | Content README in the matching directory |
| Sitemap/gallery build verification | `apps/web/content-surface.profile.json` | `scripts/check-content-surface.mjs`; runtime sitemap output needs a product-owned live check |
| Production configuration | both `wrangler.jsonc` files, `.production-safety.env`, and the secret-rotation path | `docs/production-configuration.md` |
| Template design preview | `apps/web/template-preview-worker.mjs` and both preview Wrangler configs | Build-output wrapper; anonymous public-route allowlist; `deploy:preview` / `preview:check`; never reuse preview identities downstream |
| Optional Expo app | `optional/mobile` | `docs/mobile-package.md` and mobile runbooks |
| Upstream template change | Path classified by `GOVERNANCE.md` | latest relevant dated audit, live configuration, architecture boundaries, focused PR |

## Server request path

```text
Hono registration
  → request context
  → runtime oRPC router
  → standard guard
  → product router
  → service/policy
  → repository
  → D1/provider adapter
```

Small modules omit unused layers. `routers/` mounts contracts and `lib/` owns
technical infrastructure; neither is a product-business-logic directory.

## Sources of truth

| Concern | Authoritative source |
| --- | --- |
| Workspace layout, runtimes, import rules | `template-kit/repository-facts.json` |
| Root commands | root `package.json` |
| Product configuration | product-owned files under `packages/app-config/src` |
| Web content-surface verification shape | `apps/web/content-surface.profile.json` |
| Resolved feature dependencies | `packages/app-config/src/features.ts` |
| Physical runtime composition | `packages/app-config/src/platform-composition.ts` |
| API surface | `apps/server/src/routers/runtime-router.ts` and registered Hono routes |
| Business schema | `apps/server/src/db/schema` |
| Applied structural history | ordered SQL under `apps/server/src/db/migrations` |
| Cloudflare resource identity | `apps/*/wrangler.jsonc` plus the target Cloudflare account |
| Production deploy allowlist | untracked `apps/server/.production-safety.env` |
| Durable architecture decisions | `docs/adr` |

## Generated, optional, and historical material

- Do not edit `apps/web/src/routeTree.gen.ts` manually.
- `optional/mobile` is outside the root workspace and has its own lockfile.
- `dist`, `.turbo`, `.wrangler`, and dependency directories are generated.
- `docs/audits`, `docs/template-hardening`, `docs/upgrades`, versioned rollout
  notes, migration records, and `docs/prompts` are historical or task-specific
  evidence. Their old paths and facts may be correct for the recorded date; do
  not use them as current repository navigation.
- `openspec/changes/archive` preserves completed change history. Active work
  uses the current OpenSpec change or a plan under `docs/plans`.

## Map maintenance rule

Update this file when an ownership boundary, runtime entry point, canonical
configuration source, or common change path changes. Do not update it for an
internal rename that leaves the same public boundary intact, and do not commit
generated symbol dumps as a second repo map. CodeGraph is intentionally not part
of the default workflow: `rg`, this intent map, repository facts, and focused
source reading are sufficient for this solo-maintainer template.
