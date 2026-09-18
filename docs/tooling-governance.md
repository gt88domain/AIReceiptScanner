# Tooling governance inventory

`AGENTS.md` is the sole normative instruction source. This document is an
inventory of retained automation, not a second policy source.

## Authority boundaries

- `AGENTS.md`: normative contributor and agent instructions.
- `template-kit/repository-facts.json`: machine-readable repository facts and
  enforced import boundaries.
- `package.json`: canonical local command names.
- `.github/workflows/quality.yml`: CI verification orchestration.
- `.github/workflows/auto-merge.yml`: sole implementation that decides and
  performs automatic merges.
- `.github/workflows/release-please.yml`: release PR creation and check
  dispatch only.

`GOVERNANCE.md` and this document are pointers and explanations. Dated audits,
plans, prompts, and upgrade notes are historical evidence rather than current
instructions.

## Retained root scripts

Every retained executable has one explicit guarded object:

| Script | Guarded object |
| --- | --- |
| `analyze-web-bundle.mjs` | Built Web bundle sizes and chunk budgets |
| `backoffice-preview-safety.mjs` | Backoffice preview production isolation |
| `build-profile-matrix.mjs` | Product-profile build compatibility matrix |
| `check-architecture-boundaries.mjs` | Imports constrained by repository facts |
| `check-auto-merge-sha.mjs` | Automatic merge exact-SHA and adoption exclusions |
| `check-brand-safety.mjs` | Reusable/public Web surfaces without product branding leakage |
| `check-content-surface.mjs` | Sitemap, gallery profile, and generated content surface |
| `check-deploy-entry-points.mjs` | Package deploy command ownership and preflight chaining |
| `check-development-isolation.mjs` | Development-only packages excluded from production paths |
| `check-expo-auth-compatibility.mjs` | Server/mobile Better Auth version compatibility |
| `check-module-feature-todo.mjs` | Module decision CSV schema and lifecycle fields |
| `check-product-profiles.mjs` | Profile definitions and Wrangler examples |
| `check-production-identity.mjs` | Production artifacts without demo identity or placeholder resources |
| `check-public-config-leaks.mjs` | Built public assets without private configuration values |
| `check-repository-facts.mjs` | Repository facts against executable workspace configuration |
| `check-security-headers.ts` | Web response security-header contract |
| `check-web-performance-budget.mjs` | Combined Web performance reports against declared budgets |
| `check-wrangler-types.mjs` | Generated Worker binding types against source declarations |
| `measure-homepage-assets.mjs` | Homepage asset count and byte measurements |
| `profile-build-report.ts` | One requested profile's build descriptor |
| `template-upgrade-check.mjs` | Upstream ancestry and downstream modification compatibility |

Files ending in `.test.mjs` test the named checker. Files under `scripts/lib`
are shared implementations and are not standalone policy gates. New scripts
must name a distinct guarded object here; otherwise extend an existing checker.

## Skills

`.agents/skills` contains the small active EasyStarter task surface. Generic
vendor references and overlapping operational walkthroughs are retained in
`.agents/skills-archive` so history is recoverable without loading them as
active repository instructions. Restore an archived skill only in a focused
change that documents why an active skill cannot cover the task.

## Verification status

This inventory does not claim that checks have run. Execution status belongs in
the change-local plan or review record.
