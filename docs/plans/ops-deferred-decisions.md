# Deferred operations and architecture decisions

## Core goal

Resolve only findings supported by current code and provider behavior, while
preserving audit history and avoiding a second routing or migration truth.

## Decisions

| ID | Evidence-based decision | Status |
| --- | --- | --- |
| AUTH-105 | Production in-memory throttles trust only `cf-connecting-ip`; exact WAF path expressions and deployment obligations are documented | Repository portion implemented; external WAF deployment pending |
| EMAIL-102 | React templates now generate HTML and plain text; current Resend Contacts are global and do not require the legacy Audience ID proposed by the CSV | Plain-text fix implemented; Audience recommendation rejected |
| CORE-101 | Stable full client contract and module-pruned runtime router have different purposes; runtime omission is already intentional and tested as 404 | No code change; recommendation rejected |
| JOB-103 | `job_event` is append-only audit history tied to durable jobs; replacing it with ephemeral logs would discard evidence | No code change; deletion rejected |
| DATA-101 | SQL migrations are complete but snapshots 0010-0015 are absent and journal generator versions change; only an authorized Drizzle generate/check can prove safety | Verification gate recorded; metadata not hand-edited |

## External completion gates

AUTH-105 cannot be marked operationally complete from repository code. Before
production launch, create the two WAF rate rules from `docs/rate-limiting.md`,
capture their rule IDs and target zone in the private release record, and prove
that spoofed `x-forwarded-for` does not change the counting identity.

DATA-101 requires an isolated copy of the repository and database migration
state. Run Drizzle's check/generate workflow without accepting generated files,
review whether it produces an empty structural diff, and stop if it attempts to
recreate or drop any existing table. Never fabricate missing snapshots or edit
applied SQL.

## Deferred test plan

After core-goal review, add focused tests proving:

- production throttling ignores spoofed forwarded/real-IP headers and uses the
  Cloudflare IP;
- local development retains existing forwarded-header behavior;
- contact, newsletter, and ticket callers select production trust mode;
- a React email template sends both non-empty HTML and plain text;
- an explicit text-only email remains unchanged;
- runtime router tests continue to prove disabled procedures are absent/404 and
  enabled procedures reach their real guards.

Recommended commands, not run:

```sh
pnpm --filter @repo/shared test
pnpm --filter server test:config
pnpm --filter server db:check
```

No tests, Drizzle generation, WAF changes, deployments, or provider calls were
performed in this phase.

Public write endpoints select Cloudflare-only identity unconditionally rather
than depending on `NODE_ENV`. A request missing `cf-connecting-ip` enters one
shared bounded bucket; it cannot opt out of throttling by removing the header.
