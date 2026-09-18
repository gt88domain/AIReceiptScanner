## ADDED Requirements

### Requirement: Public pages SHALL expose SSR SEO metadata
The system SHALL render stable server-side SEO metadata for public pages, including `title`, `description`, canonical URL, Open Graph, Twitter tags, and locale alternate links.

#### Scenario: Marketing landing page metadata
- **WHEN** a crawler requests `/`, `/zh`, or `/jp`
- **THEN** the response includes localized `title`/`description`, canonical URL, and `hreflang` alternates

#### Scenario: Legal page metadata
- **WHEN** a crawler requests `/privacy` or `/terms` (with or without locale prefix)
- **THEN** the response includes page-specific localized metadata and canonical URL

### Requirement: Docs pages SHALL expose document-level SEO metadata
The system SHALL derive docs metadata from the resolved document and emit article-style SEO data.

#### Scenario: Dynamic docs metadata
- **WHEN** a crawler requests `/docs/<slug>` in any supported locale
- **THEN** the response includes document title/description-derived meta and localized canonical URL

#### Scenario: Docs JSON-LD
- **WHEN** a docs page is rendered
- **THEN** the response includes `TechArticle` JSON-LD structured data

### Requirement: Build output SHALL include localized sitemap and prerendered public routes
The system SHALL generate sitemap/prerender output for public localized pages and exclude non-public pages.

#### Scenario: Sitemap generation
- **WHEN** the web app is built with sitemap enabled
- **THEN** `sitemap.xml` includes `/`, `/privacy`, `/terms`, `/docs` and their `/zh` and `/jp` variants

#### Scenario: Non-public exclusion from sitemap
- **WHEN** sitemap is generated
- **THEN** private routes such as `/auth/*`, `/dashboard/*`, and billing/authenticated flows are not included

## MODIFIED Requirements

### Requirement: Non-public pages SHALL be non-indexable by default
The system SHALL mark non-public route groups and fallback pages as `noindex,nofollow` to prevent accidental indexing.

#### Scenario: Auth and dashboard route groups
- **WHEN** a crawler requests `/auth/*`, `/dashboard/*`, `/settings/*`, or `/billing/*`
- **THEN** the response contains `robots` meta set to `noindex,nofollow`

#### Scenario: Not found route
- **WHEN** a crawler requests an unmatched route handled by the splat page
- **THEN** the response contains `robots` meta set to `noindex,nofollow`
