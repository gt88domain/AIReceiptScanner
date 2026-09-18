## 1. Planning Data And Documentation Truth

- [x] 1.1 Repair `docs/module-feature-todo.csv` so the header and every record
      have exactly 17 fields, including an explicit `problem_or_risk` value.
- [x] 1.2 Add or restore `PROD-003` as the product-module integration decision
      and remove all dangling TODO dependencies; keep intentional numbering gaps.
- [x] 1.3 Replace stale evidence paths with current v2.6 paths, including
      `emails`, `avatar-policy.ts`, `lib/context.ts`, `lib/auth.ts`,
      `audit-auth-accounts.ts`, `config/production.ts`, `landing-page`, and
      `app/register-core-routes.ts`.
- [x] 1.4 Correct overstatements in the CSV: Admin Analytics is retained,
      optional Mobile is not an empty shell, the request logger does not log query
      strings, and preview environments already exist.
- [x] 1.5 Record that downstream adoption is deferred. Keep adopter inventory as
      dated evidence; clarify or update the separately named recommended new-
      project baseline without claiming downstream adoption.
- [x] 1.6 Add a small planned CSV integrity checker using the standard library;
      do not implement it until the test-authoring phase in section 7.

## 2. English-Only Launch Boundary

- [x] 2.1 Add a product-owned static published-locale decision with only `en`
      enabled for the first launch.
- [x] 2.2 Make Web locale navigation, request handling, public page generation,
      Blog/Docs publication, sitemap, canonical alternates, and hreflang consume
      the published-locale decision.
- [x] 2.3 Ensure `/zh/*` and `/jp/*` are absent from navigation, sitemap,
      prerender output, and alternate links and return a real not-found response.
- [x] 2.4 Keep authentication, legal, billing, and transactional-email fallback
      language consistently English for the launch.
- [x] 2.5 Plan the dormant Japanese key migration from `jp` to `ja` before any
      Japanese route is published; do not add a live redirect for an unlaunched URL.

## 3. Authentication Simplification

- [x] 3.1 Inventory every email OTP configuration, client plugin, form, mail
      sender/template, translation, and optional-mobile reference.
- [x] 3.2 Remove the email OTP capability end-to-end while preserving verified
      email/password registration, login, verification, and reset flows.
- [x] 3.3 Keep GitHub, Google, and Apple disabled and otherwise unchanged; do not
      add providers, account linking behavior, 2FA, passkeys, or session UI.
- [x] 3.4 Review Auth boundary imports so product code still reaches Better Auth
      only through `apps/server/src/auth/adapter.ts` and standard guards.

## 4. Private Route Indexing

- [x] 4.1 Define one Web-local static source for non-public route prefixes.
- [x] 4.2 Derive `X-Robots-Tag`, robots disallow entries, sitemap exclusion, and
      prerender exclusion from that source.
- [x] 4.3 Cover Admin, Auth, Billing, Credits, Dashboard, Help, Purchases,
      Settings, Tickets, Users, API/RPC, and the development-only design system.
- [x] 4.4 Confirm that route authorization remains server-side and does not
      depend on robots, sitemap, hidden navigation, or locale handling.

## 5. Deployment And Recovery Safety

- [x] 5.1 Remove `deploy:dev` or bind it to an explicit non-production Wrangler
      config; preserve guarded production deploy and isolated preview deploy.
- [x] 5.2 Update current deployment documentation so only approved commands are
      presented and raw `wrangler deploy` is not an operating path.
- [x] 5.3 Write a solo-operator D1 backup/recovery runbook after checking current
      Cloudflare account capabilities; include ownership, retention, encrypted
      storage, export cadence if needed, and a non-production restore rehearsal.
- [x] 5.4 Do not run a production export, restore, migration, secret operation, or
      deployment as part of this change.

## 6. Scope Reduction And Core Review Checkpoint

- [x] 6.1 Keep Tickets disabled and use support email for launch; do not build
      ticket outbox/pagination/i18n until Tickets is explicitly enabled.
- [x] 6.2 Keep Admin Analytics, optional Mobile, and dormant Assets; do not delete
      them based only on default-off status.
- [x] 6.3 Audit unused Shadcn Studio/demo components and direct dependencies;
      delete only confirmed unused files, and preserve active Tailark layout and
      pricing code.
- [x] 6.4 Disable the automatic signup credit grant and remove default
      subscription trials; retain `free` only as the no-entitlement state.
- [x] 6.5 Stop at an undeployed, versioned feature-branch checkpoint as
      explicitly authorized by the owner; do not push `main`.
- [x] 6.6 Review the entire implementation against proposal goals, non-goals,
      architecture boundaries, repository facts, and the English-only decision.
- [x] 6.7 Obtain user acceptance of the core implementation before adding tests.

## 7. Deferred Test Authoring

Do not start this section until 6.6 is complete and 6.7 is accepted.

- [x] 7.1 Add the standard-library CSV integrity check for field count, unique
      IDs, and dangling TODO references; connect it to the existing documentation
      facts gate without adding a dependency.
- [x] 7.2 Add focused locale/SEO checks proving only English public routes and
      alternates are emitted and every private prefix is excluded consistently.
- [x] 7.3 Add the smallest focused Auth check proving the enabled login surface
      matches the server capability and no email OTP endpoint/UI is advertised.
- [x] 7.4 Add or update the production-safety self-check proving repository
      deploy scripts cannot use the default production config without preflight.
- [x] 7.5 Do not add broad UI snapshot suites, fixtures, a new runner, or tests
      for capabilities that remain disabled and unchanged.

## 8. User-Authorized Verification Only

Record these commands for a later explicit request; do not run them
automatically:

- [x] 8.1 `pnpm docs:facts-check`
- [x] 8.2 focused CSV checker command added in 7.1
- [x] 8.3 focused Web locale/SEO tests added in 7.2
- [x] 8.4 focused server Auth and production-config tests added in 7.3–7.4
- [x] 8.5 `pnpm check:boundaries` because Auth/config ownership is touched
- [x] 8.6 `pnpm check-types` because the change removes TypeScript Auth and
      locale surfaces
- [x] 8.7 `pnpm lint` and `pnpm fmt:check`
- [x] 8.8 `pnpm test` and `pnpm build` only for the final release gate after all
      focused checks and user authorization

## 9. Handoff

- [x] 9.1 Report the reviewed diff, authored tests, commands actually executed,
      and any remaining downstream-only decisions.
- [x] 9.2 Leave the milestone as an undeployed, pushed feature-branch checkpoint
      for user acceptance, as explicitly authorized by the owner.
- [x] 9.3 Create versioned Conventional Commits because the user explicitly
      asked; never push `main`, deploy, or mutate production resources from this
      plan.
