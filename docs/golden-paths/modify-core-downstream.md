# Modify upstream core downstream

First prefer a product module or static extension point. If a protected Core or
Platform path must change, add `.template/modifications/MOD-xxxx.json` before
editing it. Choose the classification, record owner/impact/test evidence, and
add upstream issue or removal deadline where required. Run
`pnpm template:check-modifications --base <base-sha>`; CI rejects unrecorded
protected changes.
