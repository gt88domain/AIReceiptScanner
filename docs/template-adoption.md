# Template adoption checklist

Before a customer deploys this template, they must replace every preview identifier. The preview
domain is intentionally left in deployment configuration as a visible checklist item, not as a
runtime default to copy unchanged.

Do not run a blind repository-wide replacement. Domains, Worker names, database IDs, bundle IDs,
and payment product IDs have different formats and must be replaced with values from the buyer's
own accounts.

## Define the paid offer first

Every downstream product must state what it sells, the price, how payment is
collected, how fulfillment happens, and how a refund is handled before choosing
a technical profile. Public preview content is fine, but the template does not
enable a free product, signup-credit grant, or subscription trial by default.
A product with no paid offer is not an adoption target for this template; any
future promotion is an explicit downstream pricing decision.

- Use the built-in Billing + Jobs path when a verified webhook must grant
  subscription, lifetime, credit, or other automatic digital entitlement.
- For sponsored placement, paid links, listing review, or another manually
  fulfilled service, start with a provider payment link or invoice plus a small
  product-owned order record. Do not enable Credits, Storage, or multiple
  payment-provider state machines merely because the product charges money.

Start by finding the preview domain:

```bash
rg -n "demo\.aiarticles\.com" --glob '!**/node_modules/**'
```

Review and replace the following groups together:

| Buyer-owned value | Locations to update |
| --- | --- |
| Web and API domains | `apps/web/wrangler.jsonc`, `apps/server/wrangler.jsonc`, `optional/mobile/eas.json` |
| Product name, support email, website and app links | `packages/app-config/src/product-config.ts` |
| Cloudflare Worker, D1, R2, and service-binding names | both `wrangler.jsonc` files |
| Native bundle identifier and deep-link scheme | `optional/mobile/app.json`, `packages/app-config/src/product-config.ts` |
| Stripe and RevenueCat membership product/price IDs | `packages/app-config/src/app-config.ts` |
| Membership tiers and credit-package product IDs | `packages/app-config/src/membership-config.ts`, `packages/app-config/src/product-config.ts` |
| Transactional-email sender and production secrets | `apps/server/.env.production.example` and Worker secrets |

The newsletter proxy deliberately uses the Web Worker's `API_SERVICE` binding and no longer embeds
the preview API hostname. Buyers should still update the binding's `service` name in
`apps/web/wrangler.jsonc`.

The public `/contact` form uses the same `API_SERVICE` binding and sends messages to the configured
`supportEmail`. It requires the transactional-email sender and `RESEND_API_KEY` listed above.

## New SaaS project workflow

1. Create a repository from the template and keep this repository as the
   `template` remote described in [upstream sync](./upstream-sync.md).
2. Create the product-owned D1 ledger beginning with `0000_product_init.sql`.
   Future template releases do not add their migration history to that ledger;
   record optional platform-schema installs in
   `template-capabilities.lock.json`. See
   [product-owned D1 ledger and capability installs](./product-owned-ledger.md).
3. Record the paid offer and choose the smallest delivery path: built-in
   Billing for automatic entitlement, or a product-owned order plus manual
   fulfillment for services such as sponsored links.
4. Choose source-controlled capabilities in `packages/app-config`: auth is
   core; enable Billing, Credits, Storage, Jobs, and native/mobile support only
   when the product needs them. Mobile additionally requires
   `productConfig.common.features.mobile: true` in `product-config.ts`; this
   activates only its Server integrations, not Expo dependencies in the root
   workspace. See [platform modules](./modules.md).
5. Create business domains in `apps/server/src/modules/<domain>` and
   `apps/web/src/modules/<domain>`; do not customize core modules for the first
   product feature.
6. Record verification in the change plan. Before deployment, explicitly run
   `pnpm install --frozen-lockfile`, `pnpm lint`,
   `pnpm check-types`, `pnpm test`, and `pnpm build`, then complete the
   production configuration preflight.
