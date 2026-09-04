# Final validation plan

Status: implementation and static topic reviews complete; integrated review findings remediated and follow-up review pending; no command in this document has been run.

Branch: `review/integration-final`

Baseline: `ee550f56df435085f262e707a2e9da5cf352e01c`

Reviewed integration base: `37cf95f9e04ce07e947e867e425639164cb4f602`

## Authorization boundary

| IDs | Recorded decision | Candidate provenance |
| --- | --- | --- |
| AUTH-103, AUTH-109, PAY-116, LANG-101 | Preserve the separately reviewed integration-base implementation; do not reopen or extend it in the deferred-topic pass | `ee550f5..37cf95f` |
| TOOL-107 | Apply the user-approved conservative consolidation; preserve rollback evidence and protected surfaces | `b698120`, `0705d01` |
| Deferred Web, storage, operations, and payment IDs listed in their topic plans | Implement only evidence-supported CSV findings; reject or defer disputed/product-policy changes | Commits after `37cf95f`, ending at the final reviewed candidate |

This table records a closed list, not domain-wide authorization. In particular,
it does not authorize PAY-117, further provider removal, destructive audit-data
changes, or freezing protected content surfaces.

## Rules

- Run only after the user explicitly confirms the test phase.
- Run read-only checks before any command that can regenerate files.
- Do not deploy, migrate production data, configure WAF, or call live payment APIs without a separate explicit approval.
- Stop at the first failing gate, preserve its output, and fix on a new review commit.
- Repeat affected checks after a fix; run the full suite only after targeted checks pass.

## Gate 0: reproducible dependency installation

1. `pnpm install --frozen-lockfile`
2. `pnpm --dir optional install --frozen-lockfile`

## Gate 1: repository and generated-file checks

1. `pnpm fmt:check`
2. `pnpm lint`
3. `pnpm check-types`
4. `pnpm docs:facts-check`
5. `pnpm check:boundaries`
6. `pnpm profiles:check`
7. `node scripts/check-auto-merge-sha.mjs`
8. `pnpm db:check`

`DATA-101` decision: if `pnpm db:check` confirms the known Drizzle snapshot/journal drift, do not hand-edit metadata. Review the exact Drizzle output first, then request approval before running `pnpm db:generate` and committing generated files.

## Gate 2: focused automated suites

1. `pnpm --filter @repo/app-config test`
2. `pnpm --filter server test:config`
3. `pnpm --filter server test:production-config`
4. `pnpm --filter server test:integration`
5. `pnpm --filter web test:integration`
6. `pnpm --filter server exec tsx ../../scripts/check-security-headers.ts`

Required coverage includes:

- asset ownership, historical-avatar adoption, legacy URL deletion, and bounded R2 listing;
- Cloudflare-only public-write rate limiting and missing-IP fail-closed behavior;
- Resend HTML/plain-text rendering;
- CSP headers, public form verification, and failed-query retry targeting;
- late credit-order completion, payment-operation retry deadlines, manual-review resolution races, Stripe refund/dispute visibility, voided invoices, dead-letter listing/acknowledgment, and purchase-history cursor pagination.

## Gate 3: full repository checks

1. `pnpm test:template`
2. `pnpm test:integration`
3. `pnpm test:unit`
4. `pnpm build`
5. `pnpm mobile:check`

## Gate 4: local browser checks

- Load the production-style Web build and confirm hydration completes with no CSP console violation that blocks application scripts or styles.
- Submit contact and newsletter forms with valid, invalid, and missing Turnstile tokens.
- Confirm login `returnTo` accepts same-origin relative paths and rejects external/protocol-relative paths.
- Walk purchase-history previous/next pages across equal timestamps and a forced failed later-page request.
- As an administrator, list, replay, and acknowledge a dead-letter event; resolve a manual-review payment operation and inspect its audit record.
- Confirm Fumadocs, Orama search, blog routes, and design-system gallery remain available.
- With real non-production Turnstile, GA, and OpenPanel keys, confirm each
  provider request succeeds and no required script, frame, or connection is
  blocked by CSP. Record browser network and console evidence without storing
  the keys in the repository.

## Gate 5: provider sandboxes

- Stripe test mode: card checkout, delayed asynchronous credit payment after local expiration, zero-value proration invoice void, full refund, partial refund, dispute creation/loss, and webhook replay.
- RevenueCat sandbox: signature rejection, normal subscription lifecycle, customer-support refund dead letter, and identity transfer. Verify that application credits do not move automatically.
- R2 test bucket: upload/list/delete by owner, cross-owner rejection, historical current-avatar adoption, and URL compatibility without rewriting provider paths.
- Turnstile test sitekey/secret: valid form submissions pass, invalid and
  missing tokens fail closed, and the challenge frame/network requests are not
  blocked by CSP.

## Gate 6: external production readiness

- Apply and independently review the Cloudflare WAF rules documented in `docs/rate-limiting.md` for both public form endpoints and every direct API hostname.
- Confirm Turnstile, Stripe, RevenueCat, Resend, D1, R2, and Queue secrets/bindings with `pnpm verify:production-config`; do not deploy from this validation step.
- Confirm production price IDs, including the intentional `$299` / `29900`-cent sample, against provider dashboards.
- Record evidence that the one-time legacy credit recovery audit ran on each deployed database before deleting `legacy-recovery-audit` in a future change.

## Explicit exclusions

- `PAY-117` and `TOOL-107` follow-up policy changes beyond the already reviewed conservative consolidation.
- Automatic cross-account credit transfer, automatic subscription revocation without provider evidence, destructive billing-event retention, and deletion of `job_event`.
- Freezing or removing Fumadocs, Orama, blog, or design-system gallery.
- Production deploys, production migrations, and live money movement.
