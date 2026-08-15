# Portfolio adoption dry-run: 2026-08-15 / v0.9.0

Recommended upstream baseline: `v0.9.0`
(`0e13637accdd2a28630d1a59f67885cab9a99f4c`). This is a read-only
assessment, not an automatic downstream update, merge, deployment, or
migration plan.

## Method

Each product was assessed against its exact `origin/main` commit using the
current `template:upgrade-check` implementation in a disposable local clone.
The helper and manifest schema were injected only into those disposable clones
so the current checker could produce its normal JSON report; no product
worktree, remote branch, D1 database, Worker, R2 bucket, or deployment was
changed. `workingTreeDirty: true` in the raw reports refers only to that
temporary helper injection.

```bash
pnpm template:upgrade-check --from <source> --to v0.9.0 --remote template --json
```

The command reports a block when both the upstream and downstream histories
touch migration or database paths. That is the intended fail-closed result:
review a product-specific migration slice before considering any merge.

## Results

| Downstream | Main assessed | Source lock | Result | Evidence |
| --- | --- | --- | --- | --- |
| Prompt Dir | `5aab3b8` | provisional pre-release commit `3fa26fe` | blocked | 609 upstream files; 13 upstream and 5 downstream database paths; 5 protected overlaps |
| AIBranding | `07b510a` | `v0.4.0` / `9017860` | blocked | 375 upstream files; 8 upstream and 20 downstream database paths; 13 protected overlaps |
| URL Next | `11f6490` | `v0.4.0` / `9017860` | blocked | 375 upstream files; 8 upstream and 20 downstream database paths; 37 protected overlaps |

The common database signal includes upstream migration metadata and the
credits, jobs, and payments schemas. It does **not** authorize applying those
migrations in a downstream product.

## Portfolio decisions

| 建议采用项 | 可忽略项 | 需决策项 |
| --- | --- | --- |
| Record and keep an honest source lock for every downstream. | A full `v0.9.0` merge into any product: all three dry-runs are intentionally blocked. | Prompt Dir predates the first release tag. Decide whether to preserve its explicit pre-release commit lock indefinitely or establish a separately reviewed normalization point. |
| Review `9eeed30` (`fix(config): keep email identity out of web bundle`) as a small, product-by-product security/configuration slice. All three web apps resolve shared product configuration. | Backoffice previews, control transports, generic admin surfaces, jobs/billing UI, and analytics that a product has not requested. | For each product, decide which upstream capability slices are actually wanted and prepare their migration plans separately. |
| Keep the existing nanoid `3.3.18` resolutions. They already address the known vulnerable 3.x baseline in all three lockfiles. | A shared directory schema, directory migration chain, URLs, SEO policy, catalog UI, or product read model in the upstream template. | Whether and when a particular blocked report becomes a normal merge PR; it requires a named owner, target D1 identity, migration review, and product parity checks. |

## Per-product interpretation

### Prompt Dir

The recorded source commit is the actual common ancestor with EasyStarter and
precedes the first release. It is deliberately marked provisional rather than
pretending it adopted `v0.4.0`. Prompt's own `0020` reconciliation migration
and Discovery schema overlap upstream migration metadata, so `v0.9.0` needs a
separate migration-aware review before any upstream code is adopted.

### AIBranding

The lock is now complete and records the real `v0.4.0` adoption. Its product
migration history, product configuration, context, authorization, and public
read adapter changes overlap protected upstream paths. The old product remains
an adapter: retain its D1 schema, URLs, SEO, and commercial behavior; do not
attempt a bulk template merge.

### URL Next

Its existing `v0.4.0` lock was already complete and is unchanged. The URL
directory migrations, public-read adapter, app configuration, and jobs/assets
areas overlap too broadly for a mechanical upgrade. Keep the current
product-owned database and URL contract; adopt future upstream slices only
after page-level and migration review.

## Decision

`v0.9.0` is the recommended future evaluation baseline, not the currently
adopted version of the portfolio. No source lock is advanced to `v0.9.0` by
this record. No product has been merged, deployed, or changed outside the two
source-lock metadata fixes.
