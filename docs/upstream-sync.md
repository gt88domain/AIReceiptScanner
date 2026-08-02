# Upstream sync

Downstream products should preserve the template as a named remote, pin normal
adoptions to a released tag, and record local changes instead of copying core
code silently into product-specific branches.

```bash
git remote add template https://github.com/gt88domain/easystarter-template.git
git fetch template
git merge v0.1.0
```

Use a merge for normal product updates because it preserves the product's own
history. A rebase is acceptable only for an unshared product branch that the
team explicitly intends to rewrite. `template/main` is an integration branch,
not a stable downstream dependency; consume a newer release tag after its
release notes have been evaluated.

## Downstream manifest

Copy `template-kit/downstream-manifest.example.json` and
`template-kit/downstream-manifest.schema.json` to `.template/` in the product
repository, naming the former `manifest.json`. Set the exact release tag and
commit, then list every intentional local change. Keep the file with the
product so an AI or maintainer can distinguish product work from upstream
divergence during a later sync.

The allowed ownership values are:

- `product`: a business domain under the documented module roots; preserve it.
- `core-contract`: a deliberate deviation from an upstream contract; reconcile
  it with each upstream release.
- `deployment`: buyer-owned identifiers or infrastructure settings; preserve
  them while applying the upstream safety contract.

Resolve conflicts by keeping product behavior in product modules and accepting
template fixes in core modules. A conflict in auth, migrations, billing,
credits, jobs, storage, or shared packages is an upstream-contract review, not
a place to paste product logic.

After each sync, run `pnpm install --frozen-lockfile`, `pnpm lint`,
`pnpm check-types`, `pnpm test`, and `pnpm build`. Update the manifest's
release and commit only after these checks pass.
