# Server domain modules

`src/modules/<domain>/` is the canonical home for new product-domain server
code. A domain is a business capability such as `catalog`, `novels`, or
`directory`; it is not a technical concern such as database, HTTP, or UI.

Do not put new product behavior in `routers/`, `lib/`, or an unrelated
platform module. `routers/` mounts routers, and `lib/` is only for shared
technical infrastructure such as auth, oRPC setup, and request context.

## Module shape

Create only the files the module needs:

```txt
src/modules/catalog/
  router.ts       # oRPC input/output boundary
  service.ts      # application orchestration
  repository.ts   # D1 reads and writes
  policy.ts       # authorization and business rules
  schema.ts       # module-owned Zod contracts and domain types
```

A small read-only module might need only `router.ts` and `repository.ts`. Do
not add empty layers. Drizzle table definitions remain in
`src/db/schema/<domain>.ts`; `schema.ts` here owns the module's API/domain
contracts, not database migrations.

Dependencies flow inward: `router -> service -> repository -> db`. Policies
are called by the router or service. Repositories must not import routers, and
web code must not import server modules.

Add a module's public router to `src/modules/index.ts`; `src/routers/index.ts`
mounts that registry. Keep the registration change separate and predictable.

Existing platform-owned code under `payments/`, `credits/`, and `lib/auth.ts`
is not duplicated or moved just to match this layout. Move it only as part of
a scoped refactor with behavior verification.

Use `payments` as the canonical billing domain name while that module remains
in place; do not create a competing `billing/` directory. New product domains
such as `catalog`, `content`, `directory`, and `novels` start under `modules/`.
