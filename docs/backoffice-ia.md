# Backoffice information architecture

This is the current template IA at `v0.11.0`. “v1.0”, “v1.1”, and “v1.2” are completed backoffice milestone names, not semantic-release version numbers.

## Account workspace

Dashboard, Account (Profile and Security), and Help are always available. Billing appears with `features.web.billing`; Credits with `features.web.credits`; Purchases with web billing or web credit purchases. Tickets adds My Tickets below Help only when its capability is enabled.

Help uses the server-configured `CONTACT_RECIPIENT`; the browser never receives it. If delivery is unavailable, including Backoffice preview mode, the form is disabled and the user is given the support email instead.

The Apps group appears only when a downstream registers one or more build-time user modules. Saved, rewards, and anonymous visitor collections are not generic template pages.

## Administration workspace

Every `/admin/*` route is server-side administrator guarded. Overview, Analytics, Users, Audit, and System are the stable core. Payments is read-only and appears only when billing or web credit purchases are enabled. Support appears only when Tickets is enabled. Refunds, disputes, tax, and provider mutations remain in the payment provider dashboard.

System shows runtime composition, safe resource status, the D1 migration ledger, and Providers. It replaces standalone Integrations navigation; `/admin/integrations` redirects to `/admin/system`. Credentials, provider identifiers, and database connection details never enter the read model.

Overview is a small read-only queue based on real webhook/payment operation records and, when enabled, open Tickets. Traffic, Worker runtime metrics, and infrastructure logs remain in their analytics providers and Cloudflare.

Downstream product administration pages are build-time modules. Their manifests add navigation; their thin routes use `createAdminModuleRoute()`, which fixes the existing admin guard. See [`backoffice-modules.md`](./backoffice-modules.md).

## Visibility matrix

| Surface | Always | Capability or registration controlled |
| --- | --- | --- |
| Account | Dashboard, Profile, Security, Help | Billing, Credits, Purchases, My Tickets, Apps |
| Administration | Overview, Analytics, Users, Audit, System | Payments, Support, product admin modules |

Browser visibility is presentation only. Billing entitlement, administrator access, and user authentication remain separate server-enforced decisions.

## Permanent boundaries

- No runtime plugins, remote module loading, sandbox, generic SQL proxy, or generic write proxy.
- No RBAC database model, observability product, deployment history, or Central changes in the template workspace.
- No advanced ticket features: attachments, assignment, labels, SLA, priority, full-text search, push/realtime notification, or custom-field system.
- No product-specific Domains, Offers, Quotes, Submit, or order workflow in template core.
- No writes from the administration Payments screen; provider dashboards own provider actions.
