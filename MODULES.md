# Modules

This is the module inventory for MySaaS work on top of EasyStarter.

## Existing EasyStarter Modules

- auth: Better Auth flows and sessions.
- billing/payments: Stripe, Creem, Waffo, RevenueCat integration.
- credits: credit packages, balance, ledger, purchase flows.
- storage: R2 and Aliyun OSS provider support.
- email: Resend and React Email templates.
- i18n: web/server/native messages.
- dashboard: existing authenticated shell and settings pages.

## MySaaS Extension Modules

Planned or candidate modules:

- `public-read`: public D1 read model seeded from JSON fixtures.
- `discovery`: optional directory/search/SEO graph.
  Its reusable list layer is protocol + shell + resource adapter, not a
  universal page renderer. See `docs/mysaas-discovery-listing-plan.md`.
- `projects`: generic AI product workspaces.
- `assets`: generated/uploaded asset library.
- `usage`: AI usage and cost read model.
- `api-keys`: developer API key management, when needed.

Build only what a real converted site needs.

## Promotion Rule

Start site-specific. Promote to shared module only when:

- two real sites need it,
- one real site proves it is core,
- it protects correctness/security, or
- it removes repeated setup work.

Module files can change freely. EasyStarter core edits must be recorded in
`CUSTOMIZATIONS.md`.
