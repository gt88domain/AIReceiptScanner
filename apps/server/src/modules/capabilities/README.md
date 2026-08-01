# Feature capabilities

Use this module for product access such as `design.generate` or
`directory.export`. Add the capability and its minimum membership tier in
`packages/app-config/src/app-config.ts`, then call:

```ts
await context.capabilities.can({ userId: context.session.user.id }, "design.generate");
```

Unknown capabilities deny by default. This is separate from
`src/auth/capabilities`, which defines administrator permissions. Feature
capabilities are resolved only from webhook-backed billing data and cannot
grant administrator access.
