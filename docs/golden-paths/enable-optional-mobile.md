# Enable optional mobile

Run `pnpm --dir optional install`, set
`productConfig.common.features.mobile: true` in
`packages/app-config/src/product-config.ts`, and configure Expo identity,
deep links, mobile auth, RevenueCat, and notifications only when used. Use
`pnpm mobile:dev` for development. When the user requests verification, the
focused mobile gate is `pnpm mobile:check`; web-only deployments must retain no
Expo or RevenueCat environment requirement.
