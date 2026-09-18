# Server platform composition

`PlatformComposition` is the one runtime contract for a Worker build. A
`ProfileBuildDescriptor` adds its official profile ID, required resources,
configured payment providers, and deterministic checksum. Its pure constructor
accepts `{ features, featureCapabilities }`; only the resolver reads product
configuration. `pnpm profiles:build` uses that descriptor for every Server and
Web profile build, then performs Wrangler `deploy --dry-run` for both Workers
without changing product configuration, deploying, or leaving build files in
the worktree.

The stable `platformContractRouter` is a compatibility contract for the default
Web client. It is deliberately broader than a profile runtime. The Server uses
`buildRuntimeAppRouter(composition)`, which physically omits disabled namespaces
before the RPC and OpenAPI handlers are created. The Web keeps one typed client
contract and guards capability-owned pages at their route/layout boundary; it
does not generate a separate route tree for every profile.

- Core owns health, session, safety middleware, CORS, i18n, and RPC transport.
- Auth owns Better Auth HTTP and the verified-email page.
- Email owns newsletter and contact HTTP endpoints.
- Storage owns the public storage HTTP endpoint.
- Billing webhooks exist only when Billing is enabled and only for configured providers.
- Product domain routers remain in `apps/server/src/modules` and are mounted through the static oRPC module extension point.

Registrars are explicit imports, not plugin discovery. A product adds a domain
module; it does not edit `createApp()` unless it is changing an upstream platform
surface.

`createContext({ context, runtimeConfig })` receives the same immutable runtime
contract used by route registration. Jobs, Storage, Email, Payments, and Credits
services are created only when their capability is enabled. Billing-off uses a
free entitlement reader; it is not a fake payment provider.
