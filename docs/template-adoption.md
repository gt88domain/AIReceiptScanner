# Template adoption checklist

Before a customer deploys this template, they must replace every preview identifier. The preview
domain is intentionally left in deployment configuration as a visible checklist item, not as a
runtime default to copy unchanged.

Do not run a blind repository-wide replacement. Domains, Worker names, database IDs, bundle IDs,
and payment product IDs have different formats and must be replaced with values from the buyer's
own accounts.

Start by finding the preview domain:

```bash
rg -n "demo\.aiarticles\.com" --glob '!**/node_modules/**'
```

Review and replace the following groups together:

| Buyer-owned value | Locations to update |
| --- | --- |
| Web and API domains | `apps/web/wrangler.jsonc`, `apps/server/wrangler.jsonc`, `optional/mobile/eas.json` |
| Product name, support email, website and app links | `packages/app-config/src/app-config.ts` |
| Cloudflare Worker, D1, R2, and service-binding names | both `wrangler.jsonc` files |
| Native bundle identifier and deep-link scheme | `optional/mobile/app.json`, `packages/app-config/src/app-config.ts` |
| Stripe, Creem, Waffo, and RevenueCat product IDs | `packages/app-config/src/app-config.ts` |
| Transactional-email sender and production secrets | `apps/server/.env.production.example` and Worker secrets |

The newsletter proxy deliberately uses the Web Worker's `API_SERVICE` binding and no longer embeds
the preview API hostname. Buyers should still update the binding's `service` name in
`apps/web/wrangler.jsonc`.

The public `/contact` form uses the same `API_SERVICE` binding and sends messages to the configured
`supportEmail`. It requires the transactional-email sender and `RESEND_API_KEY` listed above.

## Account deletion policy

The template's recommended default is to block account deletion while a paid subscription is
active. The customer first cancels through the provider billing portal, then can delete the account
after the subscription ends. The implementation must also define the retention period for billing
records and a retryable process for deleting user-owned storage objects.

This is an application behavior and a legal policy; it cannot be satisfied by adding a standalone
`/policy` page. Once the buyer's legal copy is approved, reflect the chosen retention and deletion
terms in the privacy policy and terms pages.

## New SaaS project workflow

1. Create a repository from the template and keep this repository as the
   `template` remote described in [upstream sync](./upstream-sync.md).
2. Choose source-controlled capabilities in `packages/app-config`: auth is
   core; enable Billing, Credits, Storage, Jobs, and native/mobile support only
   when the product needs them. Mobile additionally requires
   `common.features.mobile: true`; this activates only its Server integrations,
   not Expo dependencies in the root workspace. See [platform modules](./modules.md).
3. Create business domains in `apps/server/src/modules/<domain>` and
   `apps/web/src/modules/<domain>`; do not customize core modules for the first
   product feature.
4. Before deployment, run `pnpm install --frozen-lockfile`, `pnpm lint`,
   `pnpm check-types`, `pnpm test`, and `pnpm build`, then complete the
   production configuration preflight.
