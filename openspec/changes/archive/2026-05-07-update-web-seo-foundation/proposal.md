# Change: Upgrade web SEO foundation for TanStack Start pages

## Why
The web app currently ships only root-level metadata, which limits discoverability and produces inconsistent indexing behavior between public and private routes. We need a route-level SEO baseline that is SSR-friendly, locale-aware, and reproducible at build time.

## What Changes
- Add a unified SEO helper that returns route `meta` and `links` with canonical, Open Graph, Twitter, robots, and optional JSON-LD support.
- Add route-level SEO `head` output for public pages (`/`, `/docs/$`, `/privacy`, `/terms`).
- Add unified `noindex,nofollow` for non-public routes (`/auth/*`, dashboard layout, billing layout, splat/404).
- Add locale-aware canonical and `hreflang` alternates for `en/zh/jp`.
- Enable TanStack Start `prerender` and `sitemap` and define public localized pages.
- Update `robots.txt` with sitemap location and API/RPC disallow rules.

## Impact
- Affected specs: `web-seo`
- Affected code:
  - `apps/web/src/utils/seo.ts`
  - `apps/web/src/routes/**`
  - `apps/web/vite.config.ts`
  - `apps/web/public/robots.txt`
