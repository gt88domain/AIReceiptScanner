# Use D1 as the business-data owner

## Decision

Cloudflare D1 is the template's business database. Only the API Worker owns its
binding, Drizzle schema, and ordered migrations. Web and native clients use the
API Worker; the Web Worker does not receive a business D1 binding or execute
business SQL.

## Why

The template is deliberately Cloudflare-native: D1 is available through the
Worker binding alongside R2, Queues, and Workflows. One data owner keeps
authorization, auditing, migrations, and transaction semantics in one runtime.

## Consequences

- Schema lives in `apps/server/src/db/schema`; structural history lives in
  `apps/server/src/db/migrations`.
- A product that requires PostgreSQL is an explicit architecture change, not a
  hidden provider abstraction or an unused dependency.
- The Web Worker remains an SSR/UI/API-client boundary and cannot bypass server
  authorization.
