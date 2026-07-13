# Architecture

EasyStarter is the upstream base. MySaaS custom work should stay as extension
modules unless a small core change creates a stable extension point.

## Shape

```txt
apps/web      TanStack Start web app
apps/server   Hono Cloudflare Worker API
apps/native   Expo native app
packages/*    shared config, i18n, API client, utilities
docs/*        template planning and operating notes
```

## Boundaries

- Browser/UI code does not access D1 or server secrets directly.
- `apps/server` owns D1, R2, provider secrets, webhooks, auth, payments, credits,
  storage, and server-side APIs.
- `packages/app-config` owns non-secret cross-platform business config.
- `packages/api-client` owns typed client access to server APIs.
- `packages/shared` owns runtime-neutral utilities only.

## Extension Rule

Prefer new modules under:

```txt
apps/server/src/custom/<module>/
apps/web/src/custom/<module>/
packages/site-modules/<module>/
```

Small core touch points are allowed when tracked in `CUSTOMIZATIONS.md`:

- server router mount
- route file
- nav/config hook
- seed/check script

Do not fork auth, billing, credits, or provider internals for ordinary product
features.

## Discovery Listing Boundary

Discovery list pages use protocol + shell + resource adapter. Shared listing UI
lives under `apps/web/src/custom/discovery/listing/`; resource-specific search,
cards, facets, D1 loaders, and SEO stay under
`apps/web/src/custom/discovery/resources/<resource>/` and the matching server
custom module. See `docs/mysaas-discovery-listing-plan.md`.
