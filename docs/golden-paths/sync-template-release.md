# Sync a template release

Fetch the template remote and merge the target immutable tag. Update
`.template/source.json` only after resolving conflicts and passing install,
lint, types, tests, and build. Preserve product modules and document any Core
or Platform deviations in the PR or commit message. Do not merge arbitrary
`template/main` as a normal downstream update.
