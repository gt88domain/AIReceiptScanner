# Backoffice information architecture

The authenticated workspace has two deliberately separate surfaces.

## Account workspace

Always available: Dashboard, Account (Profile and Security), and Help.

Billing appears only when `features.web.billing` is enabled. Credits appears only when
`features.web.credits` is enabled. Purchases appears when web billing or web credit purchases
is enabled. These decisions come from `resolveBackofficeVisibility`; UI hiding does not grant
or revoke server access.

Help reuses the existing contact delivery path. It sends only to the server-configured
`CONTACT_RECIPIENT`; the browser never receives that value. When delivery is unavailable,
including Backoffice preview mode, the UI directs the user to the configured support email.

Saved, rewards, anonymous visitor collections, and an Apps shell are not part of v1.0.0.

## Administration workspace

Every `/admin/*` route remains server-side admin guarded. The pages are Overview, Analytics,
Users, Payments (only with a web payment capability), Audit, and System. Payments is read-only.
Refunds, disputes, tax, and provider actions remain in the provider dashboard.

System includes runtime composition, safe resource status, the D1 migration ledger, and a
Providers section. It replaces the standalone Integrations navigation; `/admin/integrations`
redirects to `/admin/system` for compatibility. Neither screen exposes credentials, provider
identifiers, or database connection information.

Overview is a small read-only queue based on real webhook/payment operation records and the
System read model. It intentionally contains no invented deployment events, ticket counts, or
observability product.

## Explicit v1.0.0 exclusions

- Ticket/chat UI or ticket feature flags
- Central control changes and product-specific pages
- Writes from the admin payment screen
- Runtime plugin/App registries, RBAC, observability, or deployment history
- New payment-provider record URLs unless a safe configured URL is already part of a read model
