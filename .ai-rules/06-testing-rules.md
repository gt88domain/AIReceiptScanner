# Testing rules

## Allowed

- Add the smallest focused automated proof when changing auth, admin access,
  billing, webhooks, credits, migrations, jobs, or security boundaries.
- Run the template gates before proposing a core change.

## Forbidden

- Do not skip tests because an AI generated the change.
- Do not replace a money, auth, or migration test with a screenshot or manual
  claim.

## Example

A new payment webhook path tests ordinary-user denial, verified delivery,
duplicate delivery, and the resulting entitlement or credit ledger state.
