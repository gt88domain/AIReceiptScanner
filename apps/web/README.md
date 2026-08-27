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

See [`../../docs/repo-map.md`](../../docs/repo-map.md) for the repository-level
change map.
