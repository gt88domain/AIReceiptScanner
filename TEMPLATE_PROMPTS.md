# Template Prompts

Use these prompts when starting new MySaaS/EasyStarter work.

## New Development Prompt

```text
You are working on an EasyStarter-based MySaaS template.

Read first:
- CUSTOMIZATIONS.md
- ARCHITECTURE.md
- MODULES.md
- DATA_FLOW.md
- DECISIONS.md
- docs/mysaas-ai-handoff-rules.md

Rules:
- Treat new product work as an extension module first.
- Prefer apps/server/src/custom/<module>/, apps/web/src/custom/<module>/, or
  packages/site-modules/<module>/.
- Do not modify auth, billing, credits, or provider internals unless fixing a
  real bug.
- Keep EasyStarter core edits minimal.
- If you modify EasyStarter core, update CUSTOMIZATIONS.md with files touched,
  reason, upstream merge risk, rollback notes, and verification command.
- Do not add dependencies unless there is no standard-library or existing
  dependency solution.
- Every non-trivial change leaves one small runnable check.

Before coding, report:
1. Files you plan to add.
2. EasyStarter core files you plan to touch.
3. Whether CUSTOMIZATIONS.md needs an entry.
4. Verification command.
```

## Public Read Migration Prompt

```text
Plan/implement public read migration only:
- Neon -> JSON fixture -> D1 seed -> public pages.
- No auth, billing, admin, provider secrets, or runtime Neon dependency.
- Build with real fixture data before visual polish.
- Keep module code isolated under custom/public-read where practical.
- Update CUSTOMIZATIONS.md for any EasyStarter core edits.
```

## Component Extraction Prompt

```text
Review recent site work for reusable components.

Do not abstract one-off code. Promote only repeated UI or stable contracts.
Prefer EasyStarter/shadcn components. Keep site copy and business rules outside
shared components. If core files are changed, update CUSTOMIZATIONS.md.
```

## Discovery Listing Prompt

```text
You are changing an EasyStarter/MySaaS Discovery listing.

Read first:
- CUSTOMIZATIONS.md
- ARCHITECTURE.md
- MODULES.md
- DECISIONS.md
- docs/mysaas-ai-handoff-rules.md
- docs/mysaas-discovery-module-spec.md
- docs/mysaas-discovery-listing-plan.md
- DATA_FLOW.md when changing D1, fixtures, or public-read code

Use protocol + shell + resource adapter. Shared listing code owns only layout,
generic states, and small stable types. Resource code owns route schemas, D1
queries, facets, cards, pagination, SEO, and editorial blocks.

Keep new code under apps/web/src/custom/discovery or
apps/server/src/custom/discovery. Do not create a universal list renderer. Do
not add a package or modify EasyStarter core unless a real repeated need proves
it necessary. Any core edit requires a CUSTOMIZATIONS.md entry.

Before coding, report files to add, core files to touch, and one verification
command. After coding, report the result, verification, and remaining risks.
```
