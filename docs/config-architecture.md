# Config Architecture

## Goals

- Provide a single source of truth for cross-platform business configuration.
- Keep secrets out of source-controlled config.
- Reuse the same typed config in server, web, and shared domain packages.

## Single Config Source

The compatible assembled config is exported as `appConfig` from
`packages/app-config/src/app-config.ts`. Product-owned metadata, auth selection,
Email capabilities, Storage selection, membership, and Credits catalogs live in
`packages/app-config/src/product-config.ts`; resolvers, types, and dependency
rules remain in the protected config modules.

This config includes non-sensitive settings such as:

- Application name
- Auth callback paths
- Email provider metadata (non-secret)
- Payment provider defaults and plan catalog (under `appConfig.web.payments` and `appConfig.native.payments`)
- Storage provider defaults and upload rules
- Route paths used for URL construction

`appConfig.common` is strictly shared across platforms. Platform-specific config lives in
`appConfig.web` and `appConfig.native`, including payments configuration.

Use `resolveWebCommonConfig()` / `resolveNativeCommonConfig()` in platform code.
They return merged common values for that platform; the web resolver also includes
web routing/payment fields for convenience.

## Runtime Assembly

Runtime values are assembled inside each app:

- `apps/server/src/configs/server-config.ts`: combines `resolveWebCommonConfig()` with `env.SERVER_URL`
- `apps/web/src/configs/web-config.ts`: reads merged web config from `resolveWebCommonConfig()`, including `routes`, then combines with `appUrl` and current locale

This keeps `@repo/app-config` focused on static, non-secret business configuration.

## Secrets Boundary

Secrets must **not** be stored in `appConfig`.

Keep secrets in runtime env systems:

- Local: `apps/server/.dev.vars`
- Deploy: `wrangler secret put ...`
- Web public env: `apps/web/.env.*` (non-secret public values only)

Examples of secrets that stay outside unified config:

- `BETTER_AUTH_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- OAuth client secrets

## Adoption Rules

- Use `@repo/app-config` for business configuration constants.
- Do not hardcode duplicated config literals in app modules.
- Use `@repo/app-config/payments/web`, `@repo/app-config/payments/native`, and `@repo/app-config/storage` for domain-facing config helpers.
