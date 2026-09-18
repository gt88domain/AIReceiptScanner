# Security rules

## Allowed

- Use `requireUser`, `requireAdmin`, `requireCapability`, and
  `requireEntitlement` at server trust boundaries.
- Store secrets in Worker configuration and validate production deployment with
  the production safety preflight.

## Forbidden

- Do not trust hidden UI, client plan state, headers invented by a product, or
  a database role for administrator access.
- Do not commit secrets, add D1 bindings to web, or expose storage keys as an
  authorization decision.

## Example

An export endpoint checks `requireCapability` on the server even when the web
navigation item is hidden for free users.
