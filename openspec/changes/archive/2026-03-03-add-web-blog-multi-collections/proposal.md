# Change: Add multi-collection blog module for web app

## Why
The web app has docs content but lacks a production-ready blog module that supports multilingual content and structured relationships. We need a first-class blog that aligns with existing TanStack Start + Fumadocs architecture and supports SEO, navigation discovery, and content integrity checks.

## What Changes
- Add a new web blog module with three content collections: `blog`, `author`, and `category`.
- Add public blog routes for list, post detail, and category listing.
- Add multilingual blog content directories for `en`, `zh`, and `jp` with aligned slugs.
- Add blog UI components (cards, category filter, table of contents, related posts, author card, anchor copy headings).
- Add blog i18n copy in `web` messages and expose `Blog` in the marketing header navigation.
- Add a content validation script to enforce locale slug parity and blog reference integrity (`author` and `category`).
- Extend web prerender public pages with blog locale entries.

## Impact
- Affected specs: `web-blog`
- Affected code:
  - `apps/web/source.config.ts`
  - `apps/web/src/lib/blog-source.ts`
  - `apps/web/src/routes/_public/(marketing)/blog/**`
  - `apps/web/src/components/blog/**`
  - `apps/web/src/components/layout/tailark/header/header.tsx`
  - `apps/web/vite.config.ts`
  - `apps/web/scripts/validate-blog-content.mjs`
  - `packages/i18n/src/messages/web/*.json`
