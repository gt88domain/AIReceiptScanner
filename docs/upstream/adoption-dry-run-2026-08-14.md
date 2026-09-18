# Portfolio adoption dry-run: 2026-08-14

Recommended upstream baseline: `v0.8.1`
(`86662fce598be420021a1f8c56d7851f093d2984`). This is a manual-adoption
record, not an automatic downstream update.

## Results

| Downstream | Main | Source-manifest state | `template:upgrade-check` result |
| --- | --- | --- | --- |
| Prompt Dir | `6b9f28c` | no `.template/source.json` | command is not installed |
| AIBranding | `0b5cce3` | manifest has the adopted commit but lacks the required `template` and release fields | command is not installed |
| URL Next | `11f6490` | manifest records `v0.4.0` / `9017860` | command is not installed |

Each command was invoked in the corresponding clean downstream worktree with
`--from v0.4.0 --to v0.8.1 --json`. It performed no Git, migration, Cloudflare,
or source write. All three stopped before an upgrade assessment because their
current repositories do not yet contain the upstream's
`scripts/template-upgrade-check.mjs` command; this is a truthful bootstrap
result, not a successful adoption report.

## Manual next step

When a downstream deliberately adopts a future EasyStarter release, first add
the current adoption tooling in that product PR, complete the source manifest,
and then run:

```bash
pnpm template:upgrade-check --from <adopted-release> --to <target-release> --remote template --json
```

The command is read-only: it does not fetch, merge, rebase, change a manifest,
run migrations, or change cloud resources. It must be followed by the normal
product review; no bot opens or merges a downstream pull request.

## Decision

The portfolio now has one recommended released baseline and an explicit
adopter inventory. It does **not** claim that any product is currently ready to
adopt `v0.8.1`. Bootstrap readiness is product work and must not be papered
over by changing product URLs, schemas, migrations, or UI code in upstream.
