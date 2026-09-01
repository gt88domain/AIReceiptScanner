# Template governance

`GOVERNANCE.md` is the concise root entry point for contributors and AI agents.
This document provides the operational detail for that policy.

EasyStarter is a governed upstream template, not a product. Its job is to keep
the infrastructure that every downstream SaaS relies on stable, secure, and
easy to upgrade.

## Template-owned surface

The template owns shared infrastructure and its contracts:

- authentication, authorization, and security utilities;
- D1 schema/migrations, storage abstractions, jobs, billing, and credits;
- Worker/API boundaries, deployment rules, CI, and shared packages;
- template documentation, ADRs, and release/versioning policy.

Changes here require a focused PR, maintainer review, tests, and a template
version bump. A product may propose a core improvement, but must not silently
specialize core behavior for one product.

## Product-owned surface

Products own their business domains under `apps/server/src/modules/<domain>`
and `apps/web/src/modules/<domain>`.

Examples include a domain marketplace and logo generation for AIBranding,
provider-specific generation workflows for an AI Generator, and a game catalog
or runtime for an HTML5 product. Product code may consume core contracts but
does not change their meaning.

## Change decision

1. Is this reusable infrastructure required by more than one product? If not,
   create a product module.
2. Does the change alter a public template contract or architecture boundary?
   Add or update an ADR and bump `template-version.json`.
3. Does it affect auth, money, data, jobs, storage, or deployment? Add focused
   tests and request template-maintainer review.

See [architecture boundaries](./architecture-boundaries.md) for dependency
rules and [upstream sync](./upstream-sync.md) for downstream update workflow.

## Template versioning

`template-version.json` uses semantic versions. Bump PATCH for compatible bug
fixes, MINOR for a new optional capability, and MAJOR for a breaking
architecture or contract change. Release Please creates the release PR, updates
`CHANGELOG.md` and `template-version.json`, then creates the immutable tag.
Every architectural change records its reason in an ADR and uses a Conventional
Commit so the release level is explicit.

`template-kit/recommended-baseline.json` points to the latest released commit
that has been reviewed for downstream adoption. It can legitimately lag the
prospective version inside a generated Release Please PR because that release
commit and tag do not exist yet. Update the baseline after the tag exists; the
facts checker validates its tag and full-SHA shape without creating a circular
release dependency.

## Merge gate

For this single-maintainer template, every ready (non-Draft) PR is squash merged
automatically only after `Quality` (`static`, `test`, and `build`), OSV, and—when
the changed paths require it—the optional Mobile check have succeeded on its
current head commit. Draft PRs are never merged automatically.

Fork PRs never merge automatically. Changes to CI, scripts, template tooling,
dependency manifests, or server auth, payments, credits, database, and server
scripts additionally require the `maintainer-approved` label. Generated Release
Please PRs are the narrow exception: they must originate in this repository and
may change only `CHANGELOG.md`, `.release-please-manifest.json`, and
`template-version.json`.

Release Please PRs use the identical gate. GitHub does not emit a
`pull_request` event for a PR created with `GITHUB_TOKEN`, so the release
workflow explicitly dispatches Quality and OSV (and Mobile when relevant).
For the generated release branch, the dispatched Quality workflow performs the
same final OSV/Mobile check and squash merge itself; GitHub suppresses the
following `workflow_run` event from that token chain. Because a `GITHUB_TOKEN`
merge also does not produce a new `push` workflow run, each successful merge
explicitly dispatches Release Please.

## Main provenance audit

`Main provenance audit` checks every `main` push for an associated merged PR.
If it finds none, it opens one `main-provenance-warning` issue for that commit.
If a later audit finds that GitHub now associates the commit with a merged PR,
it records that reconciliation and closes the stale warning. Genuine direct-push
warnings stay open for maintainer audit. The workflow is an alert and never
rewrites history. It detects accidental direct pushes, but cannot protect
against someone who already has permission to push to `main` or modify
workflows; write access remains restricted to template maintainers.
Automated merges explicitly dispatch the same audit because GitHub suppresses a
`push` workflow triggered by `GITHUB_TOKEN`.
