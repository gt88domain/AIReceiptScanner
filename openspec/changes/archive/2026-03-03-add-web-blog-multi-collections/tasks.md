## 1. Implementation
- [x] 1.1 Extend `apps/web/source.config.ts` to support multi-collections for blog domain (`blog`, `author`, `category`) while keeping docs intact.
- [x] 1.2 Add blog source utilities and relationship resolution in `apps/web/src/lib/blog-source.ts`.
- [x] 1.3 Implement public blog routes for list (`/blog`), detail (`/blog/$slug`), and category (`/blog/category/$slug`).
- [x] 1.4 Add blog UI components for list cards, category filter, table of contents, heading anchors, author card, and read-more section.
- [x] 1.5 Add multilingual blog content in `apps/web/content/blog|author|category/{en,zh,jp}` with aligned slugs and valid references.
- [x] 1.6 Add blog i18n messages and include `Blog` in header menu entries.
- [x] 1.7 Add blog content validation script and expose it as `pnpm --filter web blog:validate`.
- [x] 1.8 Update web public prerender pages to include blog localized roots.

## 2. Validation
- [x] 2.1 Run `pnpm --filter web blog:validate`.
- [x] 2.2 Run `pnpm --filter web lint`.
- [x] 2.3 Run `pnpm --filter web build`.
- [x] 2.4 Run `openspec validate add-web-blog-multi-collections --strict --no-interactive`.
