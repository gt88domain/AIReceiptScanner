# MySaaS Template Evolution

This document defines how to evolve EasyStarter into a reusable AI SaaS factory
without building unnecessary modules too early.

## Current Scope

Do not build the full page target list now.

Current priority:

1. Keep EasyStarter working and close to upstream.
2. Convert real sites such as `aigenerators`, `ainovel`, and `aibranding` to the
   TanStack/EasyStarter base.
3. Implement only the pages each real site needs.
4. Extract reusable modules only after real duplication appears.

The page inventory in `docs/mysaas-page-targets.md` is a parking lot, not the
current roadmap.

## Extraction Rule

Start site-specific. Promote later.

Promote code into the shared template only when one of these is true:

- two real sites need the same feature
- one real site proves the feature is core to the business model
- the feature protects correctness or security
- the feature reduces repeated setup work across future sites

Do not promote code only because it seems generally useful.

## Module Maturity Levels

### Level 0: Site Code

Lives inside one product site.

Use this for:

- one-off landing sections
- product-specific generation UI
- custom copy/layout
- site-specific SEO pages

Do not abstract.

### Level 1: Shared Component

Lives in EasyStarter web components or a custom module folder.

Use this when:

- two pages in one site need the same UI
- props are stable
- it does not need database ownership

Examples:

- asset grid
- usage stat card
- empty state
- project switcher
- resource card

### Level 2: Optional Module

Lives under `apps/server/src/modules/<domain>/` and, when needed,
`apps/web/src/modules/<domain>/`.

Use this when:

- multiple sites need the same routes and data model
- it owns tables or API routes
- it can be enabled/disabled

Examples:

- Discovery/Search
- Projects
- Assets
- Usage Meter
- API Keys

### Level 3: Core Template Change

Modify EasyStarter core only when the change creates a stable extension point or
fixes a cross-cutting problem.

Examples:

- module router registry
- nav extension registry
- `siteModules` config shape
- template customization ledger
- web/server boundary check

## Recommended Core Changes

These are worth modifying in the base template if we decide to keep long-term
reuse clean.

### 1. Customization Ledger

Add a root or docs file:

```txt
CUSTOMIZATIONS.md
```

It should record every intentional divergence from EasyStarter upstream:

- date
- file changed
- reason
- upstream merge risk
- rollback notes

This is low-cost and high-value.

### 2. Site Module Config

Add a small config object for optional modules:

```ts
siteModules: {
  discovery: { enabled: false },
  projects: { enabled: false },
  assets: { enabled: false },
  usage: { enabled: false },
}
```

This should live near EasyStarter's existing app config, but the planner should
choose the least invasive location.

### 3. Server Router Extension Point

Instead of editing the main server router for every module, register product
routers in the stable module router registry.

Goal shape:

```ts
...moduleRouters
```

Then new modules register inside `apps/server/src/modules/index.ts`. Future
upstream merges only touch one predictable spread in the main router.

### 4. Navigation Extension Point

Instead of editing dashboard navigation for every feature, add a small custom nav
registry.

Goal:

- EasyStarter keeps its default nav
- domain modules contribute nav items when enabled
- disabled modules do not appear

### 5. Web Route Convention

TanStack file routes are static. Keep custom routes in predictable folders and
make disabled modules return not found at runtime.

Do not try to build a dynamic route plugin system before there is a real need.

### 6. Web Boundary Check

After code changes begin, add a cheap check that web does not import server code
or expose D1/server secrets.

This is not needed for documentation-only work.

## Core Touch Point Risk

Small core touch points are acceptable if they are stable and documented.

| Touch point | Risk | How to control it |
| --- | --- | --- |
| `apps/server/src/modules/index.ts` | low | register one module router, avoid per-module root-router edits |
| web route files | medium | add thin routes backed by isolated domain modules |
| dashboard nav config | medium | add a module nav registry once |
| app config/types | medium | add `siteModules` once, keep shape small |
| auth/billing/credits internals | high | avoid unless fixing a real bug |
| UI primitives | medium-high | avoid broad redesign; compose instead |

The rule is not "never edit EasyStarter." The rule is "make intentional edits
small, named, and tracked."

## Development Loop

Use this loop while converting real sites:

1. Build the feature in the target site or custom module.
2. Keep the first version boring and direct.
3. When another site needs it, compare requirements.
4. Extract only the stable common part.
5. Leave site-specific copy, styling, and business rules outside the shared
   module.
6. Add one small runnable check before promoting to shared template.
7. Record the promotion in `CUSTOMIZATIONS.md`.

## What To Build First

Do not start with a full AI SaaS OS.

Build first only when a converted site needs it:

- Discovery for `aigenerators`-style directory sites
- Projects/Assets for generation-product sites
- Usage only when AI calls are actually metered
- API Keys only when exposing an external API
- Team/Organization only when selling team plans

## What To Defer

Defer until proven:

- full RBAC
- organization model
- workflow builder
- marketplace payments
- support tickets
- analytics dashboard
- admin reports
- prompt/community marketplace

## Prompt For Planning AI

```text
You are planning how to evolve an EasyStarter-based AI SaaS template while
keeping upstream merge risk controlled.

Read:
- docs/mysaas-template-evolution.md
- docs/mysaas-extension-brief.md
- docs/mysaas-page-targets.md
- docs/mysaas-discovery-module-spec.md
- apps/server/src/routers/index.ts
- apps/web/src/routes
- apps/web/src/configs/data/sidebar-data.ts
- packages/app-config/src/app-config.ts

Goal:
Create a minimal roadmap for the next real converted site, not a full platform
roadmap.

Rules:
- Do not implement pages without a real site need.
- Build site-specific first; extract only after duplication or proven value.
- Core EasyStarter edits are allowed, but each must be small, named, and tracked
  in a customization ledger.
- Avoid auth, billing, credits internals.
- Prefer one stable module router registry and one nav extension point over repeated
  edits.
- Every promoted shared module needs one small runnable check.

Output:
1. Which real site drives the next slice.
2. Which pages are actually needed now.
3. What stays site-specific.
4. What becomes shared component/module.
5. Exact EasyStarter core touch points.
6. Customization ledger entries to add.
7. Verification command.
8. Upstream merge risk.
```
