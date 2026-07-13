## 1. Implementation
- [x] 1.1 Create unified SEO helper that returns `meta` and `links`, supports canonical, robots, Open Graph, Twitter, alternates, and JSON-LD.
- [x] 1.2 Add route `head` metadata for public pages (landing, docs, privacy, terms).
- [x] 1.3 Add `noindex,nofollow` metadata for auth, dashboard, billing, and 404 routes.
- [x] 1.4 Extend docs loader/head to include document title, description, and canonical path metadata.
- [x] 1.5 Enable TanStack Start `prerender` and `sitemap`, configure localized public page entries.
- [x] 1.6 Update `robots.txt` with sitemap declaration and crawler rules.

## 2. Validation
- [x] 2.1 Run `openspec validate update-web-seo-foundation --strict --no-interactive`.
- [x] 2.2 Run `pnpm --filter web build` and verify generated metadata and sitemap outputs.
