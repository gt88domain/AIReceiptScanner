# Payment and credits rules

## Allowed

- Use verified provider webhooks as the source of purchase/subscription state.
- Resolve paid access through entitlements and capabilities, and use the credit
  service for atomic ledger changes.

## Forbidden

- Do not grant access from a client redirect, compare plan names in product
  code, or directly mutate a credit balance.
- Do not make webhook handling non-idempotent.

## Example

A successful webhook records a provider event once, resolves entitlement, and
creates one credit transaction; repeated delivery does not charge or grant twice.
