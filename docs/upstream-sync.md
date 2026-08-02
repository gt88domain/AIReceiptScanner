# Upstream sync

Downstream products should preserve the template as a named remote, not copy
template code into product-specific branches.

```bash
git remote add template https://github.com/gt88domain/easystarter-template.git
git fetch template
git merge template/main
```

Use a merge for normal product updates because it preserves the product's own
history. A rebase is acceptable only for an unshared product branch that the
team explicitly intends to rewrite.

Resolve conflicts by keeping product behavior in product modules and accepting
template fixes in core modules. A conflict in auth, migrations, billing,
credits, jobs, storage, or shared packages is an upstream-contract review, not
a place to paste product logic.

After each sync, run `pnpm install --frozen-lockfile`, `pnpm lint`,
`pnpm check-types`, `pnpm test`, and `pnpm build`. Record the consumed template
version from `template-version.json` in the product release notes.
