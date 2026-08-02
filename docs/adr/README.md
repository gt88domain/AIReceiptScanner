# Architecture decision records

ADRs record durable template decisions that would otherwise be rediscovered in
every product migration. They are short, immutable after acceptance, and named
`NNNN-<decision>.md`. A new decision supersedes an older record; do not rewrite
history or collect unrelated decisions in one mutable document.

## Index

| ADR | Decision |
| --- | --- |
| [0001](./0001-use-canonical-membership-catalog.md) | Membership semantics use one canonical catalog. |
| [0002](./0002-use-d1-as-business-data-owner.md) | The API Worker owns D1 business data. |
| [0003](./0003-use-queues-and-workflows-by-duration.md) | Jobs/Queues and Workflows have distinct async responsibilities. |
| [0004](./0004-use-hono-and-orpc-at-the-api-boundary.md) | Hono and oRPC form the API Worker boundary. |
| [0005](./0005-use-better-auth-for-template-identity.md) | Better Auth is the template identity boundary. |
| [0006](./0006-protect-core-and-product-boundaries.md) | Core infrastructure and product domains remain separate. |

Configuration details, runbooks, and feature-specific implementation notes stay
in their respective documents; an ADR records the reason and consequences of a
decision, not every operational step.
