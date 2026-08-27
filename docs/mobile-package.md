# Optional mobile package

Web and API are the default template applications. `optional/mobile` is an
opt-in Expo workspace with an independent lockfile, so `pnpm install`,
`pnpm dev`, `pnpm test`, and `pnpm build` at the repository root do not resolve
Expo or RevenueCat dependencies.

To adopt it, run `pnpm --dir optional install`, then use `pnpm mobile:dev` or
`pnpm mobile:check`. Set `productConfig.common.features.mobile: true` in
`packages/app-config/src/product-config.ts` before configuring Expo auth, mobile
deep links, or RevenueCat. That flag activates the Server-side mobile
integrations and their production-secret checks; it is deliberately false in a
Web-only template.

Do not add `optional/mobile` back to root workspaces or root Turbo tasks.
