# web-blog Specification

## Purpose
TBD - created by archiving change add-web-blog-multi-collections. Update Purpose after archive.
## Requirements
### Requirement: Web app SHALL provide a multilingual blog content model using multiple collections
The system SHALL model blog domain content with separate Fumadocs collections for posts, authors, and categories, and SHALL support `en`, `zh`, and `jp` locales with slug parity across locales.

#### Scenario: Collection-based content source
- **WHEN** the web app loads blog content
- **THEN** it resolves blog posts from `blog` collection and relationship metadata from `author` and `category` collections

#### Scenario: Locale slug parity
- **WHEN** content is validated
- **THEN** each slug present in one locale for `blog`, `author`, or `category` exists in all supported locales

### Requirement: Public routes SHALL expose blog list, detail, and category views
The system SHALL expose public blog routes for list, post detail, and category listing, and SHALL return not-found responses for missing post/category slugs.

#### Scenario: Blog list route
- **WHEN** a user requests `/blog` (or localized equivalent)
- **THEN** the response includes published posts sorted by date descending with category filter options

#### Scenario: Blog detail route
- **WHEN** a user requests `/blog/<slug>` for an existing post
- **THEN** the response includes post content, resolved author info, resolved category labels, and related posts

#### Scenario: Missing slug behavior
- **WHEN** a user requests a non-existing `/blog/<slug>` or `/blog/category/<slug>`
- **THEN** the route resolves to not-found behavior

### Requirement: Blog pages SHALL be SEO-ready and discoverable in navigation
The system SHALL generate SEO metadata for blog pages and SHALL include a `Blog` entry in the marketing header navigation.

#### Scenario: Blog SEO metadata
- **WHEN** blog list/detail/category pages are rendered
- **THEN** each page includes route-level title, description, canonical path, and article-oriented metadata

#### Scenario: Header discoverability
- **WHEN** the marketing header is rendered
- **THEN** users can navigate to blog via a top-level `Blog` menu item

### Requirement: Blog content integrity SHALL be validated in tooling
The system SHALL provide a validation command that verifies locale parity, required frontmatter fields, and relationship references from posts to author/category slugs.

#### Scenario: Valid content
- **WHEN** `pnpm --filter web blog:validate` runs with correct content
- **THEN** the command exits successfully

#### Scenario: Broken relationship references
- **WHEN** a blog post references a missing author or category slug
- **THEN** the validation command fails with a non-zero exit code

