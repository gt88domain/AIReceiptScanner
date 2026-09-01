# Web App

TanStack Start web app.

Important areas:

- `src/routes`: file-based routes.
- `src/modules`: product-domain UI, loaders, copy, and view models.
- `src/components`: shared UI and feature components.
- `src/components/listing`: route-neutral listing, ranking, filter, and state
  primitives; product adapters own data, URL state, SEO, and copy.
- `src/components/public`: shared public-detail layout primitives.
- `src/components/landing-page`: the deliberately small starter landing page.
- `src/configs`: web config, nav, landing page registry.
- `src/lib`: browser/server utilities.
- `src/utils/orpc.ts`: typed API client wiring.

Rules:

- Do not access D1 or server secrets from web code.
- Put new product UI under `src/modules/<domain>/`.
- Keep route files thin: validate route input, call a module, and render its
  page entry point.
- Reuse `src/components/ui` before adding a shared UI primitive.

## Public shell ownership

`src/routes/_public/route.tsx` is the single composition point for public global
chrome. It owns the shared Header and Footer around its route outlet. Product
landing pages and other public leaf routes render page content only; do not add
a second Header or Footer inside a product module. Customize or replace the
public shell at `_public/route.tsx` instead of introducing a parallel layout.

`/design-system` is a lazy-loaded component gallery available only in local
development and the noindexed template preview. Production builds return 404
for that route and exclude it from sitemap/prerender output.

Template-maintainer preview commands:

```bash
pnpm --filter web deploy:preview
pnpm --filter web preview:check
```

They use `wrangler.preview.jsonc`; downstream production deployments must not
reuse those Worker names, URLs, or preview flags.

The checked-in preview Worker imports `dist/server/index.js`, the server bundle
produced by the TanStack Start/Vite build. `deploy:preview` therefore builds
before Wrangler deploys the wrapper. Keep that build-output boundary: do not
point the wrapper at unbundled route source or copy the template's preview
identity into a downstream environment.

The hosted preview is intentionally anonymous and public-only. Its wrapper
allowlists public routes, strips incoming Cookie and Authorization headers,
removes Set-Cookie responses, blocks writes, and applies noindex/no-store to
every response. Products that need authenticated acceptance should use the
isolated local Backoffice preview rather than weakening this Worker.

See [`../../docs/repo-map.md`](../../docs/repo-map.md) for the repository-level
change map.
