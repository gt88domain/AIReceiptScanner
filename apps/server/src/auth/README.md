# Server authorization boundary

`auth/adapter.ts` is the sole server-facing authentication adapter. It is the
only module outside its private provider implementation that may create an auth
client, read a session, or route `/api/auth/*`. Business modules receive the
provider-neutral request session through `Context` and use the guards below;
they must not import `better-auth`, inspect provider cookies, or call provider
APIs directly.

Changing Better Auth, Clerk, Auth.js, or another provider is therefore an
adapter migration: preserve the session shape and the guard contracts, then
replace the provider implementation. It is not a product-module rewrite.

Use the standard guards rather than reading session data, admin secrets, or
billing records directly in a router:

```ts
await requireUser(context);
await requireAdmin(context);
await requireCapability(context, "design.generate");
await requireEntitlement(context, "yearly");
```

- `requireUser` accepts only an active Better Auth session.
- `requireAdmin` checks the server-only `ADMIN_EMAILS` allowlist.
- `requireCapability` resolves a configured product capability from verified
  billing state. Unknown capabilities deny; it does not create database roles
  or trust client claims.
- `requireEntitlement` resolves the current tier from webhook-backed billing
  records. It never grants admin access.

For oRPC procedures, prefer `protectedProcedure` and `adminProcedure` from
`@/lib/orpc`. Modules needing an entitlement or capability call the matching
guard inside their procedure handler or module policy.
