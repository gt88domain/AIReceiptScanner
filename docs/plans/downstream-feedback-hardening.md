# Downstream feedback hardening plan

## Core goal

Fix the reusable template defects confirmed by multiple downstream projects,
without copying downstream behavior into core or changing any downstream
workspace. Keep the fixes small enough for products to adopt through the
normal upstream release flow.

## Observable acceptance criteria

- The public Footer does not read ambient time at module evaluation, and the
  deployed template-preview smoke check rejects an SSR copyright year of 1970.
- Core Web configuration does not resolve `expo/tsconfig.base`; the optional
  Mobile workspace retains its own Expo TypeScript configuration.
- `TANSTACK_DEVTOOLS_BUS_PORT` reaches the Web dev process through Turbo while
  the installed Devtools version keeps the existing `42069` default.
- A downstream product can add Header navigation from browser-safe product
  configuration without editing the shared Header; the template default stays
  empty and no product route or label is added upstream.
- Main-provenance reconciliation closes a warning only when GitHub later
  reports an associated merged PR. Genuine direct-push warnings remain open
  until a maintainer audits them.
- Existing preview-wide noindex behavior and disabled Mobile/Docs defaults are
  preserved rather than reimplemented.

## Implementation phases

1. **Workspace and development isolation**
   - Remove the obsolete root Expo TypeScript inheritance.
   - Pass the existing Devtools port escape hatch through the Turbo `dev` task.
2. **Public runtime behavior**
   - Move Footer year resolution into request/render work.
   - Add one data-only public-navigation extension to `public-runtime` and
     consume it in the existing Header.
3. **Repository governance**
   - Reconcile false-positive main-provenance issues when a later audit finds a
     merged PR; retain alerts for actual unprovenanced pushes.
4. **Core-goal review**
   - Review the actual diff against the acceptance criteria, ownership
     boundaries, default behavior, and downstream compatibility.
5. **Deferred test authoring**
   - Add all focused checks listed below only after the implementation review
     passes.

## Deferred test plan

| Behavior                  | Edge/trust boundary                                                            | Expected coverage                                                                                         | Recommended command                                                                 |
| ------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Optional Mobile isolation | A disabled Mobile capability must not leak Expo config into the core workspace | Development-isolation check rejects root Expo inheritance while accepting `optional/mobile/tsconfig.json` | `pnpm test:template`                                                                |
| Devtools port override    | Turbo strict environment filtering must not drop the opt-in port               | Development-isolation check asserts `dev.passThroughEnv`                                                  | `pnpm test:template`                                                                |
| Public navigation         | Default is empty; configured items are exposed unchanged to Web                | Focused app-config/Web config assertions                                                                  | `pnpm --filter @repo/app-config test` and `pnpm --filter web test`                  |
| Cloudflare SSR Footer     | Preview HTML must not contain the epoch-year copyright symptom                 | Extend the existing live template-preview smoke check                                                     | `pnpm preview:check`                                                                |
| Provenance reconciliation | Only a merged associated PR permits automatic warning closure                  | Reviewable workflow conditions; no network-mocking framework is added for one inline GitHub workflow      | Manual workflow dispatch against one false-positive and one genuine direct-push SHA |

## Status

- Implementation: complete
- Core-goal review: passed — the diff keeps product routes and labels out of
  core, preserves default capability behavior, and changes no downstream files
- Test authoring: complete
- Test execution: complete — user authorized automated verification on
  2026-09-01. Passed `pnpm docs:facts-check`, `pnpm check:boundaries`,
  `pnpm fmt:check`, `pnpm lint`, `pnpm check-types`, `pnpm test`, and
  `pnpm build`. The first type-check run exposed an overly narrow public auth
  config type; it was widened without runtime change and the complete gate then
  passed. The first format check also exposed one existing assertion layout;
  OXC reformatted that test without changing behavior.
- Downstream coordination: complete — HTML5.ai and AI Answers were told to
  wait for an upstream release and not copy the core changes locally

## Follow-up feedback batch

The 2026-08-31 follow-up is classified before implementation so a single
downstream's architecture does not become an upstream default.

| Suggestion                                                                        | Classification                              | Decision                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Make `check-content-surface` tolerate runtime sitemaps and omitted gallery assets | Confirmed upstream portability defect       | Add a small source-controlled Web verification profile. Keep the template default strict, allow an explicit runtime sitemap contract, and check gallery-only assets only when the profile includes the template gallery. |
| Functional remote Preview with live D1/R2/Queue                                   | Product/environment decision                | Do not implement. The template already has a read-only hosted preview and a safe local Backoffice acceptance preview; a remote seeded product preview needs product-specific data ownership and cleanup.                 |
| Cloudflare Containers Golden Path                                                 | Optional product architecture candidate     | Do not implement without a real product adoption. Containers add Docker, Durable Object migrations, rollout, paid-plan, and capacity decisions; heavy work must remain outside the API Worker meanwhile.                 |
| Per-profile D1/R2/Queue cost dashboard and default caps                           | Product operations decision                 | Do not implement. Cloudflare owns usage/billing metrics, while budgets and traffic economics vary by product. Keep static required-resource metadata and production preflight only.                                      |
| Anonymous public-tool Golden Path                                                 | Reusable candidate, not yet a core contract | Do not implement from one report. Anonymous limits, cost sponsorship, abuse/reporting, sharing, and embeds are product policy; extract a Golden Path only after a completed product proves the repeated boundary.        |
| Configurable public embed policy                                                  | Product security decision                   | Do not relax the current `frame-ancestors 'none'` default. Add an upstream option only together with a real embeddable product and focused CSP tests.                                                                    |
| Full deterministic staging deploy contract and manifest                           | Optional operational platform               | Do not implement for the solo default. Wrangler environments support it, but resource allowlists, secrets, migrations, payment webhooks, and smoke data require an explicitly adopted staging environment.               |
| `recommended-baseline.json` still targets v2.6.0                                  | Confirmed upstream metadata defect          | Update it to the verified latest stable tag v3.0.2 and add a consistency check against the release version/tag commit.                                                                                                   |
| Dated governance audit is treated as current                                      | Confirmed documentation-governance defect   | Mark the audit as historical evidence and change mandatory guidance to verify executable configuration rather than treating a dated snapshot as current truth.                                                           |

### Follow-up phases and deferred tests

1. Add the content-surface verification profile and make only the affected
   sitemap/gallery assertions conditional; preserve all universal asset and
   robots checks.
2. Update the recommended release metadata and historical-audit wording.
3. Review the second diff against default strictness and downstream opt-in
   boundaries.
4. Only after review, add profile parsing/self-check coverage and recommended
   baseline consistency coverage. Do not execute it without a user request.

### Follow-up status

- Implementation: complete
- Core-goal review: passed — default verification remains strict, runtime
  sitemap/gallery omissions require an explicit source-controlled declaration,
  and no runtime product behavior or Cloudflare resource was added
- Test authoring: complete
- Test execution: not requested; do not run automatically

## Mobile, preview, shell, and payment feedback batch

The 2026-09-01 feedback is classified against the current repository before
editing. Already-fixed items are not implemented a second time.

| Suggestion | Classification | Decision |
| --- | --- | --- |
| Quick-launch skill still treats `apps/native` as a root workspace | Confirmed upstream guidance defect | Update the named skill and its walkthrough to `optional/mobile`, independent install/lockfile, current root scripts, and placeholder-only examples. Add repository-facts coverage for those two guidance files. |
| Root `tsconfig.json` extends Expo | Already fixed on this branch | No additional change. The root config is removed and `optional/mobile/tsconfig.json` retains Expo locally. |
| Historical audit appears current | Already fixed on this branch | No additional change. The dated audit now has a historical banner and governance requires live-fact verification. |
| Supported TanStack Start Worker preview recipe | Existing capability with documentation gap | Keep the checked-in build-output wrapper and preview Wrangler config; document that the wrapper imports the Vite-built server output and must run after the Web build. Do not add a second preview framework. |
| Preview-generated Worker types can conflict with production literals | Valid tooling guard | Add explicit preview type-generation scripts that write only under ignored `.wrangler/types` and use non-literal vars. Keep production generated types at their existing path. |
| Public shell ownership is ambiguous | Confirmed documentation gap | State that `_public/route.tsx` is the single Header/Footer composition point and leaf routes must render page content only. Treat that route as the existing shell hook; do not add another abstraction. |
| Disabled capabilities should be physically removed | Broad optimization candidate | Do not implement without measured bundle/runtime evidence and a capability-by-capability design. Existing feature denial and lazy boundaries remain; source presence alone is not a defect. |
| Safe public preview should be first-class | Existing capability with two hardening gaps | Harden the existing hosted template preview rather than add another profile: explicit public-route allowlist, strip Cookie/Authorization on the request, strip Set-Cookie on the response, preserve noindex/robots/sitemap suppression and read-only API. |
| Template payment identifiers should be unmistakable blockers | Confirmed upstream adoption-safety defect | Replace plausible Web/native identifiers with `replace-*` values. Extend production preflight to name and reject the exact native product-config path when native billing or purchases are enabled; preserve existing Web test/prod separation checks. |

### Batch phases and deferred tests

1. Refresh the named Mobile skill and walkthrough, then extend repository facts
   so legacy `apps/native` and root-workspace commands cannot return there.
2. Document the existing build-output preview recipe and public-shell ownership;
   add isolated preview type-generation commands.
3. Harden the hosted preview request/route boundary and replace payment
   identifiers with explicit adoption blockers.
4. Review the actual diff for downstream-neutral behavior and default safety.
5. Only after review, extend preview smoke checks, facts checks, and production
   preflight self-checks. Do not execute them without a user request.

| Coverage | Recorded check | Recommended command | Status |
| --- | --- | --- | --- |
| Mobile guidance follows repository facts | Facts checker requires `optional/mobile`, the separate install, and current root command; rejects retired paths/commands | `pnpm docs:facts-check` | Authored, not run |
| Preview public-only and session-free boundary | Hosted smoke requests blocked auth/dashboard/prefix-confusion paths, sends Cookie/Authorization, and rejects Set-Cookie | `pnpm --filter web preview:check` after an explicitly authorized preview deploy | Authored, not run |
| Preview type output isolation | Wrangler check asserts both preview scripts use the preview config, ignored output directory, and non-literal vars | `pnpm check:wrangler-types` | Authored, not run |
| Native payment adoption blocker | Production self-check enables native billing and proves a placeholder fails with its app-config path | `pnpm --filter server test:production-config` | Authored, not run |

### Batch status

- Implementation: complete
- Core-goal review: passed — the diff changes only shared template guidance,
  the existing preview boundary, environment-local type generation, and
  product-owned placeholder catalogs. It adds no downstream domain, provider
  abstraction, or physical-composition rewrite. Disabled native capabilities
  remain unaffected by native product-ID validation.
- Test authoring: complete
- Test execution: not requested; do not run automatically
