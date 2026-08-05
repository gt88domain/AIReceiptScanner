# Server platform composition

The Server Worker is assembled statically in `apps/server/src/app/create-app.ts`.
`index.ts` resolves one immutable runtime contract, creates the Hono app, and
builds the Worker surface. It does not contain business routes or provider code.

- Core owns health, session, safety middleware, CORS, i18n, and RPC transport.
- Auth owns Better Auth HTTP and the verified-email page.
- Email owns newsletter and contact HTTP endpoints.
- Storage owns the public storage HTTP endpoint.
- Billing owns payment webhook registration; physical Billing omission is deferred to v0.4.5.
- Product domain routers remain in `apps/server/src/modules` and are mounted through the static oRPC module extension point.

Registrars are explicit imports, not plugin discovery. A product adds a domain
module; it does not edit `createApp()` unless it is changing an upstream platform
surface.

`createContext({ context, runtimeConfig })` receives the same immutable runtime
contract used by route registration. Jobs, Storage, and Email services are only
created when their capability is enabled.
