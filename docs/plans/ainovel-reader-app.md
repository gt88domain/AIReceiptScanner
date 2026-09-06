# AINovel reader app — implementation plan

Status: first milestone implemented; verification and preview deployment pending  
Owner: AINovel product layer  
Last updated: 2026-08-31

## Goal

Keep the original Flutter reader UI in `../novelapp/app` and replace its direct
Supabase dependency with a small, versioned Cloudflare Worker read API backed by
the existing `ainovel-public` D1 database. The first release remains useful to a
guest: browse, search, rank, read, save a local library, and resume locally.

This work does not change `ainovel.com`, deploy a Worker, run a D1 migration, or
replace EasyStarter's isolated `optional/mobile` package.

## Acceptance criteria

- The Flutter visual system and navigation remain intact.
- Public novel and chapter reads go through the API Worker; Flutter never owns
  or connects to D1 directly.
- API routes are stable and versioned under `/mobile/v1`.
- App API and website origins are build-time configurable, with safe defaults.
- Bookmarks and reading progress work for guests using device storage.
- The hard-coded Supabase URL/key and direct public-data queries are removed.
- Account login and cross-device sync are explicitly deferred rather than
  represented by placeholder premium/profile state.

## Phases

1. **API contract — completed**
   - Add product-owned `/mobile/v1` read routes through the existing public-read
     registrar extension point.
   - Reuse the existing D1 public projection and return JSON shaped for Flutter.
2. **Flutter data source — completed**
   - Add a small HTTP client and build-time environment configuration.
   - Replace Supabase novel/chapter reads while retaining the current models and UI.
3. **Guest persistence — completed**
   - Store bookmarks and reading progress locally.
   - Keep the current in-memory prefetch cache for this milestone; durable offline
     chapter downloads are the next storage slice.
4. **Account sync — deferred**
   - Enable Better Auth methods chosen for mobile.
   - Add protected library/progress endpoints and conflict resolution by latest
     `updatedAt`.
   - Add D1 structural migrations, but apply them only with explicit approval.
5. **Release — deferred**
   - Configure iOS/Android identity, signing, privacy text, store metadata, crash
     reporting, and App Store builds after the local reader is accepted.

## Core-goal review

Completed on 2026-08-31. The original reader theme, navigation, discovery,
detail, and reader widgets remain the product UI. D1 remains owned by the API
Worker; Flutter now consumes only versioned JSON. Supabase initialization and
all direct public-data/account queries were removed. Bookmarks and progress are
available without an account. No production resources were changed.

## Test plan and status

Tests were added after the core-goal review. They have not been run because the
repository rules require explicit approval for automated verification, and the
local host does not currently expose a Flutter executable.

- Added: Worker test for the exact versioned GET-only route surface.
- Added: Flutter API error/query tests, novel/chapter mapping, HTML-to-reader-text,
  local bookmark ordering, and progress restoration.
- Deferred: D1-backed response/404/filter integration fixtures and Flutter widget
  smoke tests for home, detail, resume, and offline states.

## Non-goals for the first milestone

- Authoring or AI generation inside the app (the creator is a separate desktop app).
- In-app purchases, ads, push notifications, social/forum posting, or admin tools.
- Replacing the website, production domain, production Worker, or database.
