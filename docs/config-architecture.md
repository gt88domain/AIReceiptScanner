# Configuration architecture

Configuration is split by ownership and exposure. There is no single mutable
runtime config object and no remote feature-flag system.

## Sources of truth

| Concern | Owner |
| --- | --- |
| Product identity, auth choices, email/storage selection, credit packages | `packages/app-config/src/product-config.ts` and product-owned siblings |
| Membership tiers and semantics | `packages/app-config/src/membership-config.ts` |
| Provider plan/price catalogs and platform payment policy | `packages/app-config/src/app-config.ts` |
| Browser-safe app metadata, routes, and feature switches | `packages/app-config/src/public-runtime.ts` |
| Feature dependency rules and required resource types | `packages/app-config/src/features.ts` |
| Physical module/resource composition | `packages/app-config/src/platform-composition.ts` |
| Build profile definitions and product overrides | `packages/app-config/src/profile-definitions.ts`, `product-feature-overrides.ts`, and profile build env |
| Runtime secrets and Cloudflare bindings | untracked env files and `apps/*/wrangler.jsonc` |

`appConfig` remains the compatible assembled cross-platform catalog. Runtime
code should prefer the narrow resolver or export matching its exposure boundary.

## Runtime assembly

- The browser imports `@repo/app-config/public-runtime`. It must not receive
  provider price catalogs, native-only settings, or secrets.
- `apps/web/src/configs/web-config.ts` combines public runtime configuration
  with build/runtime URLs and the current locale.
- The API Worker derives its immutable capability/resource contract through
  `apps/server/src/lib/runtime-config.ts`.
- `resolveOriginConfig()` combines the Server Worker's `WEBSITE_URL` and
  `SERVER_URL` bindings without changing product capability decisions.
- The optional mobile app uses `resolveNativeCommonConfig()` and adapts it in
  `optional/mobile/configs/app-config.ts`.

The resolved feature contract is descriptive. It controls which routes,
handlers, providers, and resources the runtime expects; it does not create
Cloudflare resources or mutate source files.

## Secret and public-value boundary

Never store secrets in `packages/app-config` or an `EXPO_PUBLIC_*`/`VITE_*`
variable.

- Local Server secrets: `apps/server/.dev.vars`
- Production secret rotation input: `apps/server/.env.production`
- Daily production preflight: required secret names read from the live Worker;
  no local plaintext secret file is required
- Web build/public values: `apps/web/.env.*` and safe Worker vars
- Mobile public values: `optional/mobile/.env.*`

Provider secret keys, webhook secrets, `BETTER_AUTH_SECRET`, `ADMIN_EMAILS`, and
OAuth client secrets belong only in the Server runtime secret path. Public OAuth
client IDs and public application URLs may live in Worker/build configuration.
Use `pnpm --filter server secrets:push:production` only for first setup or
rotation; daily deploys preserve the live secret values.

## Change rules

- Add product-owned values to the existing product-owned files; do not edit
  resolver semantics for a one-site customization.
- Add a dependency rule only for a real impossible capability combination.
- Use `resolveWebCommonConfig()` or `resolveNativeCommonConfig()` for trusted
  cross-platform configuration; use the public-runtime export in browser code.
- Keep provider-specific details in provider catalogs/adapters and keep domain
  policy based on stable plan, tier, and capability identifiers.
- `template-kit/repository-facts.json` owns machine-readable repository facts;
  configuration documentation must not duplicate its enforced rule set.

See [the architecture map](./architecture-map.md) for the configuration-to-
runtime flow and [production configuration](./production-configuration.md) for
deployment ownership.
