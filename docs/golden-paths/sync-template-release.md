# Sync a template release

Fetch the template remote and merge the target immutable tag. Update
`.template/source.json` only after resolving conflicts and passing install,
lint, types, tests, build, and modification audit. Preserve product modules;
reconcile active MOD records for Core or Platform changes. Do not merge arbitrary
`template/main` as a normal downstream update.
