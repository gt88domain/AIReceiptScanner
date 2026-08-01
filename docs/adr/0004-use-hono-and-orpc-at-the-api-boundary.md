# Use Hono and oRPC at the API boundary

## Decision

The API Worker uses Hono for HTTP concerns and oRPC for typed product
procedures. TanStack Start remains the Web Worker/UI framework; the template
does not add Next.js or a second server-rendering runtime.

## Why

Hono owns HTTP routes that need raw bodies, caching, streaming, or standard
responses. oRPC owns validated, typed procedures with the shared server context
and authorization guards. Adding another full-stack framework would duplicate
routing, SSR, configuration, and deployment responsibilities.

## Consequences

- `/api/auth/*`, webhooks, storage delivery, and other HTTP-shaped endpoints
  remain Hono routes.
- Product commands and queries use oRPC procedures and domain modules.
- Request-bound streams, WebSockets, and long-running work follow
  `docs/orpc-worker-boundaries.md`; they are not implicit oRPC defaults.
