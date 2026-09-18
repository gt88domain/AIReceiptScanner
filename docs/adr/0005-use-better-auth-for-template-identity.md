# Use Better Auth for template identity

## Decision

Better Auth is the template's authentication provider boundary. Product modules
use the server auth adapter, context, and standard guards rather than provider
cookie/session APIs.

## Why

One provider boundary keeps email/password, OAuth, session handling, and
mobile-compatible callbacks reusable without leaking provider choices into every
product domain.

## Consequences

- A future provider replacement is an explicit template architecture change.
- Auth-specific provider integration remains behind `apps/server/src/auth` and
  `apps/server/src/lib/auth.ts`.
- Product authentication requirements become capabilities or policy decisions,
  not product-local session implementations.
