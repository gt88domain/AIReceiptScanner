# Enable optional mobile

Install inside `optional/`, enable `common.features.mobile`, and configure Expo,
deep-link, mobile auth, RevenueCat, and notifications only when used. Run
`pnpm mobile:check` plus server type checks. Web-only deployments must retain no
Expo or RevenueCat environment requirement.
