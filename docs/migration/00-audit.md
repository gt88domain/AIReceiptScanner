# 00 — Audit

Do this before copying code, recreating a page, changing a schema, or adding a
feature. The output is a migration packet: evidence that a team can review
without opening the legacy project.

## Inventory

Record the old system's:

- user journeys, routes, API calls, jobs, webhooks, and scheduled work;
- database tables, object storage prefixes, external providers, and environment
  variables;
- data volumes, growth rate, retention obligations, and known bad records;
- authentication, administrator paths, payment and credit flows; and
- observable behaviour to preserve, change, or deliberately retire.

For each item, capture its source location, current owner, confidence level,
and a screenshot, request/response sample, or query result where appropriate.
Do not treat old source code as a specification: it is evidence to audit.

## Required decision

Classify every discovered surface as one of:

| Decision | Meaning |
| --- | --- |
| Preserve | Behaviour or data must reach the new system unchanged. |
| Replace | Keep the user outcome, but implement it using template conventions. |
| Retire | Remove it deliberately, with an owner accepting the loss. |
| Defer | Keep it out of this migration slice and record the dependency. |

Stop here if the owner, source of truth, or desired outcome is unknown. Those
are product decisions, not implementation details.
