# EasyStarter upstream feedback from the AINovel adoption

Date: 2026-08-31  
Scope: downstream adoption notes; no upstream source was modified here.

## Highest-priority fixes

1. **Mobile guidance disagrees with repository facts.**
   `.agents/skills/easystarter-mobile-quick-launch/SKILL.md` still tells users to
   edit `apps/native`, run `pnpm -F native`, and treat mobile as a root workspace.
   The current source of truth and `docs/mobile-package.md` correctly place it at
   `optional/mobile` with its own lockfile. Generate the skill's paths and commands
   from `template-kit/repository-facts.json`, or cover them with the facts checker.

2. **The root TypeScript config still depends on optional Expo.**
   Root `tsconfig.json` extends `expo/tsconfig.base`, even though Expo is deliberately
   outside the default workspace. A web/API-only install can therefore report that
   its base config is missing. Use a platform-neutral root config and let
   `optional/mobile` extend Expo inside its own package.

3. **Historical audits look like current instructions.**
   `docs/audits/upstream-governance-baseline.md` accurately records an older
   `apps/native` state, but it is easy for an adopter or agent to treat its table as
   current truth. Add a prominent historical-snapshot banner linking to repository
   facts, or move time-bound audit evidence under a clearly archival path.

## Adoption friction worth smoothing

4. **Provide a supported Worker preview recipe for TanStack Start.**
   A normal Wrangler entry targeting the application source can miss generated
   TanStack virtual modules, while wrapping the built server output works. A small
   documented preview entry/config would prevent every downstream from rediscovering
   this distinction.

5. **Keep environment-specific generated Worker types isolated.**
   Generating types for a preview config with a literal `NODE_ENV: "preview"` into
   an included source tree can conflict with production environment declarations.
   Recommend separate generated-type directories/configs or a shared non-literal
   environment type.

6. **Document public shell ownership as an extension point.**
   Replacing a landing page while also composing the template's public layout can
   accidentally render two headers/footers. The template should state whether the
   route or the `_public` layout owns global chrome and offer one product shell hook.

7. **Disabled capabilities should disappear more completely.**
   Feature flags hide behavior, but disabled auth, billing, admin, and optional
   surfaces can still leave routes, assets, placeholder product IDs, or sizeable
   bundles in downstream builds. Prefer physical composition and lazy boundaries so
   a one-person product pays only for enabled capabilities.

8. **Make safe public previews a first-class profile.**
   A reusable preview profile should support an explicit route allowlist, strip
   cookies/auth, add `X-Robots-Tag: noindex, nofollow`, block robots, and suppress
   sitemaps. These are easy to get subtly wrong when every downstream writes its own
   wrapper.

9. **Mark template payment identifiers as adoption blockers.**
   Native/web product IDs remain plausible-looking values even when billing is
   disabled. Use unmistakable placeholders plus a production preflight that names
   the exact config path that must be replaced.

## What should stay

- API Worker ownership of D1 and the web service-binding boundary.
- Product modules under `apps/server/src/modules` and `apps/web/src/modules`.
- Optional mobile isolation from the default workspace.
- Production preflight checks and explicit module/capability configuration.
- Static, narrow extension points instead of a general plugin framework.
