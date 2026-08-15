# Upstream sync

Downstream products should preserve the template as a named remote, pin normal
adoptions to a released tag, and record local changes instead of copying core
code silently into product-specific branches.

```bash
git remote add template https://github.com/gt88domain/easystarter-template.git
git fetch template --tags
git checkout -b chore/adopt-easystarter-vX.Y.Z
pnpm template:upgrade-check --from vX.Y.Z --to vA.B.C
git merge --no-ff vA.B.C
```

Use a merge for normal product updates because it preserves the product's own
history. A rebase is acceptable only for an unshared product branch that the
team explicitly intends to rewrite. `template/main` is an integration branch,
not a stable downstream dependency; consume a newer release tag after its
release notes have been evaluated.

## Downstream manifest

Copy `template-kit/downstream-manifest.example.json` and
`template-kit/downstream-manifest.schema.json` to `.template/`, naming the
former `source.json`. Copy `template-kit/modification.schema.json` and create
one `.template/modifications/MOD-xxxx.json` file for each protected Core or
Platform deviation. Set the exact release tag and commit in source.json. The
CI check rejects protected changes without exactly one active record.

Modification classes are `upstream-candidate`, `product-specific`, and
`temporary-workaround`. The latter requires a removal condition and deadline;
the first requires an upstream issue or PR reference.

Resolve conflicts by keeping product behavior in product modules and accepting
template fixes in core modules. A conflict in auth, migrations, billing,
credits, jobs, storage, or shared packages is an upstream-contract review, not
a place to paste product logic.

`pnpm template:upgrade-check` is read-only. It reports upstream changes,
protected-path overlap, and database risk without fetching, merging, changing
the manifest, or running migrations. It blocks migration-history changes on
both sides. Review that report before merging a released tag; EasyStarter never
updates downstream repositories automatically.

## Recommended portfolio baseline

The current recommended release is recorded in
[`template-kit/recommended-baseline.json`](../template-kit/recommended-baseline.json).
The portfolio inventory in
[`template-kit/adopters.json`](../template-kit/adopters.json) is evidence, not
a control plane: it does not open PRs, fetch remotes, or change a downstream.
See the dated [v0.9.0 dry-run record](./upstream/adoption-dry-run-2026-08-15-v0.9.0.md)
for each product's current bootstrap state and required decisions.

An adopter must have the current `template:upgrade-check` command, a complete
source manifest, and a named template remote before the check can produce an
upgrade assessment. Do not treat a missing command or manifest as a clean
dry-run result; add the tooling in that product's deliberately reviewed
adoption PR.

After each sync, run `pnpm install --frozen-lockfile`, `pnpm lint`,
`pnpm check-types`, `pnpm test`, and `pnpm build`. Update the manifest's
release and commit only after these checks pass. Open a Draft PR for the
adoption, resolve and review its conflicts, then merge it without treating the
template update as a production deployment.
