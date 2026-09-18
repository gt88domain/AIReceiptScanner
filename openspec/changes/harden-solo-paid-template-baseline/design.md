## Context

The reviewed source baseline is `origin/main@21b382a` (`v2.6.0` plus three
mainline commits) with the documentation checkpoint on
`codex/template-docs-v26`. Source and executable configuration take precedence
over historical audits and prompts.

The template is maintained by one person and will be used to start paid
products. The first public launch is English-only. Downstream projects remain
out of scope until the template baseline is accepted.

The change crosses several upstream ownership classes:

- documentation truth and machine-readable planning data;
- Web platform locale and indexing behavior;
- upstream Auth composition;
- production deployment safety;
- operational documentation.

It does not introduce a product domain or change database schema.

## Goals / Non-Goals

**Goals:**

- Make the TODO CSV safe for spreadsheet import and AI consumption.
- Encode English-only publication as a product-owned launch decision.
- Eliminate the dormant OTP configuration trap.
- Make all private routes consistently non-indexable without treating robots
  rules as authorization.
- Ensure every repository-provided production deploy command uses the safety
  preflight or an explicitly separate preview configuration.
- Give a solo operator a minimal, rehearsable D1 recovery procedure.
- Preserve valuable existing foundations and avoid speculative platform work.
- Enforce implementation-first, core-review-second, tests-third sequencing.

**Non-Goals:**

- The proposal does not change the commercial model beyond the existing
  decision that every product needs a paid path.
- It does not finish downstream product domains, billing catalogs, production
  identities, legal copy, or brand copy.
- It does not provide legal advice or promise regulatory compliance.
- It does not optimize authenticated query count without production evidence.
- It does not remove broad quality gates from the release path.

## Decisions

### Keep the default commercial path paid

The mother template keeps `free` as the internal name for an account with no
paid entitlement; it is not a public product offer. Automatic signup credits
and default subscription trials are disabled in the paid-product baseline.
Downstream products may deliberately add a trial or promotion only as part of
their pricing decision.

### Treat the CSV as machine-readable data, not prose with commas

The CSV keeps its 17-column schema. Every row will gain an explicit
`problem_or_risk` value instead of deleting that useful column. A small
standard-library checker will eventually validate row width, unique IDs, and
references to other TODO IDs.

Number gaps are allowed. Only dangling references are errors. `PROD-003` will
describe the first real product-module integration point: the empty
`moduleRouters` object is intentional until a downstream domain exists, while
Tickets remains an upstream conditional platform module. This avoids inventing
a dynamic registry merely to make an extension point non-empty.

Evidence paths must identify current files or deliberately scoped directories.
Historical documents may retain old version numbers when they are clearly
labelled as historical evidence.

### Separate supported locale code from published locale choice

The product-owned configuration will expose the smallest static published
locale list, initially `en` only. Web route generation, locale navigation,
sitemap entries, hreflang output, and request-locale acceptance will consume
that decision.

Non-published `/zh` and `/jp` paths will not appear in navigation, sitemap, or
alternate links. They should return a real not-found response unless a prior
public URL contract later requires a reviewed redirect.

The existing translation files may remain dormant so future localization does
not require reconstructing copy. Before Japanese is published, the internal
and URL language code must move from `jp` to standard `ja`; no compatibility
redirect is required while those URLs have never been launched.

Alternative considered: delete all non-English translation files. Rejected
because the files are inert once publication is disabled, while deleting and
later recreating them adds work without improving the launch runtime.

### Remove email OTP rather than complete it

The default launch keeps verified email/password authentication. Email OTP
configuration, client plugin use, OTP-only forms, and OTP-only translations or
mail senders will be removed together after an exact reference audit. The
server will not gain the Better Auth email OTP plugin in this change.

Alternative considered: add the missing server plugin. Rejected under YAGNI:
the product does not require OTP, and completing it expands rate limiting,
delivery, abuse, and support obligations.

OAuth code remains disabled and unchanged. Account purge/export, active-session
management, 2FA, and passkeys remain out of scope.

### Use one non-public route fact inside the Web package

A single static list of non-public prefixes will drive:

- `X-Robots-Tag` response headers;
- generated `robots.txt` disallow rules;
- sitemap exclusion;
- prerender exclusion.

The list includes Auth, Admin, Billing, Credits, Dashboard, Help, Purchases,
Settings, Tickets, Users, API, RPC, and the development-only design system as
appropriate for each consumer. Consumers may derive a subset when protocols
need different formatting, but they may not maintain a second independent
hard-coded list.

Authorization remains entirely server-side. Indexing controls do not grant or
deny access.

### Preserve the guarded production path and remove the ambiguous bypass

`pnpm --filter server deploy` remains the production entry and continues to run
the production preflight. `deploy:preview` keeps its dedicated preview config.
The ambiguous `deploy:dev` script will be removed or changed to a command that
can only target an explicit non-production Wrangler configuration; it must not
deploy the default configuration without the safety preflight.

Raw direct CLI invocation cannot be made impossible from application code. The
repository contract will instead expose no convenience command that encourages
the bypass and will document the approved entry points.

### Keep the recovery solution operationally small

The first D1 recovery deliverable is a runbook, not a backup platform. It will
record the selected Cloudflare-account recovery capability, a periodic export
procedure when needed, retention/location ownership, an encrypted handling
rule, and a restore rehearsal using a non-production database.

Implementation must verify current Cloudflare behavior and the actual account
plan before naming Time Travel retention or commands as guaranteed facts. No
production export or restore is run as part of this change.

### Preserve useful optional capabilities

- Admin Analytics stays: it summarizes D1 business/operational facts and does
  not duplicate Cloudflare traffic analytics.
- Tickets stays default-off. The first launch uses support email; no outbox or
  pagination work is done until Tickets is explicitly enabled.
- Optional Mobile remains outside the core workspace and is not cleaned as
  dead code.
- Assets remains dormant until a product file exists.
- Unused Shadcn Studio/demo components may be deleted only after exact import
  and package-usage evidence; active Tailark layout and pricing code remains.

### Defer test authoring until after core review

Implementation work stops at an undeployed checkpoint. The owner explicitly
authorized versioned Conventional Commits and pushes on the feature branch for
this change, so the review checks the aggregate branch diff rather than an
uncommitted worktree. Only after that review is accepted are focused tests
added in one batch.

Mandatory Auth and deployment-safety behavior still receives focused coverage
before the change can be considered deliverable. Deferring tests changes their
timing, not the final coverage requirement. Test and build commands are listed
in the plan but are never executed automatically; execution requires an
explicit user request.

## Risks / Trade-offs

- Keeping dormant translations may allow future drift -> published-locale
  checks must prove they are not exposed; future locale activation includes a
  translation review.
- Removing OTP makes future OTP work explicit -> this is desirable; re-adding
  it requires a complete server/client/email/security slice.
- A shared private-prefix list can become too broad -> keep it Web-local and
  static rather than creating a cross-repository routing framework.
- Removing `deploy:dev` may disrupt an undocumented habit -> retain the named,
  isolated preview command and document the replacement.
- A runbook does not itself create backups -> acceptance requires a named
  owner and rehearsal procedure, while actual production scheduling remains a
  separate explicitly authorized operation.
- A broad roadmap can produce a broad PR -> execute it as focused checkpoints
  in the task order and do not mix downstream or product work into it.

## Implementation Sequence

1. Repair planning data and current documentation truth.
2. Implement the English-only publication boundary.
3. Remove the dormant OTP slice.
4. Unify private-route indexing controls.
5. Close the repository-provided deploy bypass and document D1 recovery.
6. Review the complete implementation against core goals and non-goals.
7. Add the planned focused tests and checks.
8. Run verification only after explicit user authorization.

## Rollback

- Documentation and CSV corrections revert as ordinary documentation changes.
- Locale publication rolls back by restoring the previous static published
  locale set; do not publish Japanese again under `jp`.
- OTP removal rolls back only as a complete server/client/email feature, never
  by restoring the client half alone.
- Route-indexing changes roll back by reverting the shared fact and its
  consumers together.
- Deploy-script changes roll back only if the replacement still uses a
  dedicated non-production config or the production preflight.

No rollback path may rewrite applied D1 migrations, modify production secrets,
or deploy from a dirty/non-main workspace.

## Open Questions

- Which single Web payment model will the first real product use? This remains
  a downstream adoption decision and does not block template hardening.
- Which Cloudflare D1 recovery features are available on the production
  account plan? Verify during the runbook task without changing resources.
- Should dormant Chinese/Japanese copy remain maintained after English-only
  publication is proven? Revisit only when its maintenance cost becomes real.
