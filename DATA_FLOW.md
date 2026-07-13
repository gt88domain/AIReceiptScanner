# Data Flow

## Current EasyStarter Runtime

```txt
browser/native
  -> API client / auth client
  -> apps/server Worker
  -> D1 / R2 / providers
```

Web UI should not read D1 directly and should not know server secrets.

## Public Read Model Migration

First migration path:

```txt
Neon
  -> JSON fixtures
  -> D1 seed
  -> server loaders / APIs
  -> public pages
```

Scope:

- public data only
- no auth migration
- no billing migration
- no admin migration
- no runtime Neon dependency

See `docs/mysaas-public-read-model-migration.md`.

## Extension Module Flow

```txt
module fixture/schema
  -> D1 table owned by module
  -> module service/router
  -> web route loader/component
  -> shared component if repeated
```

Avoid changing EasyStarter auth, billing, credits, and provider internals unless
fixing a real bug.
