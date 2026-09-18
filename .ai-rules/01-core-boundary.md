# Core boundary

## Allowed

- Fix a reusable core bug, security issue, or documented contract through a
  focused template PR.
- Add a product domain under `apps/server/src/modules/<domain>` and
  `apps/web/src/modules/<domain>`.

## Forbidden

- Do not change auth, credits, billing, jobs, database, or shared packages to
  encode one product's business rule.
- Do not import product modules from core code.

## Example

For a marketplace listing, create `modules/catalog`; do not add catalog fields
to the generic auth or credit module.
