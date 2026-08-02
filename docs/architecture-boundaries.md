# Architecture boundaries

The template keeps product work separate from infrastructure so downstream
projects can adopt upstream fixes with small, understandable conflicts.

## Dependency direction

```text
product feature → application service → core module → database/provider
```

Core modules never import product modules. Web and mobile clients call the API;
the API Worker remains the sole business-data owner.

| Layer | Owns | May depend on |
| --- | --- | --- |
| Product | `apps/*/src/modules/<domain>` | public core contracts and shared packages |
| Application/core | auth, payments, credits, jobs, assets, storage | database/provider adapters |
| Provider | D1, R2, Queue, payment-provider integrations | platform SDKs only |

## Non-negotiable rules

- `apps/web` does not receive a business D1 binding, execute SQL, or create
  business migrations.
- Structural schema and migrations live only in `apps/server/src/db`.
- Shared packages do not import React Native, product UI, payment-provider SDKs,
  or Cloudflare bindings.
- Product UI does not import server database implementation details.
- Product server modules use established core services and guards; they do not
  invent product-specific auth, billing, or credit ledgers.

## Examples

Allowed: `apps/server/src/modules/catalog` uses the standard authorization
guards and a repository/service in its own domain.

Forbidden: a catalog React component imports `apps/server/src/db/schema` to
read D1 directly.

Forbidden: `packages/shared` imports `react-native-purchases` or
`cloudflare:workers`.

The automated check is intentionally narrow. It catches these import classes;
code review and CODEOWNERS decide whether a proposed new core contract belongs
in the template.
