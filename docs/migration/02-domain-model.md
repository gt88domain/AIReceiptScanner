# 02 — Domain model

Turn the audit into the target architecture before designing UI or writing a
data import.

## Map outcomes, not folders

For every preserved or replaced outcome, define:

- the product domain that owns it (`catalog`, `content`, `directory`,
  `novels`, etc.);
- its commands, reads, invariants, and authorization policy;
- the target module under `apps/server/src/modules/<domain>`;
- the web module under `apps/web/src/modules/<domain>` when it has UI; and
- which template foundations it uses: capabilities, jobs, assets, credits,
  audit logs, or payments.

Keep route files thin. Routes mount modules; they do not become the new home of
business logic. Do not add product behaviour to `routers/`, `lib/`,
`components/`, or generic `src/lib` files.

## Prohibited shortcut

Do not copy legacy code and then repair pages or add features around it. Extract
the behaviour and constraints, then implement the smallest target-domain design
that satisfies them. A migration is allowed to replace an old abstraction; it
is not required to preserve it.
