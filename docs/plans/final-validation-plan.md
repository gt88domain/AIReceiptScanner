# Final validation plan

Status: implementation and static topic reviews complete; integrated static review pending; no command in this document has been run.

Branch: `review/integration-final`

Baseline: `ee550f56df435085f262e707a2e9da5cf352e01c`

Reviewed integration base: `37cf95f9e04ce07e947e867e425639164cb4f602`

## Rules

- Run only after the user explicitly confirms the test phase.
- Run read-only checks before any command that can regenerate files.
- Do not deploy, migrate production data, configure WAF, or call live payment APIs without a separate explicit approval.
- Stop at the first failing gate, preserve its output, and fix on a new review commit.
- Repeat affected checks after a fix; run the full suite only after targeted checks pass.

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

## Gate 4: local browser checks

- Load the production-style Web build and confirm hydration completes with no CSP console violation that blocks application scripts or styles.
- Submit contact and newsletter forms with valid, invalid, and missing Turnstile tokens.
- Confirm login `returnTo` accepts same-origin relative paths and rejects external/protocol-relative paths.
- Walk purchase-history previous/next pages across equal timestamps and a forced failed later-page request.
- As an administrator, list, replay, and acknowledge a dead-letter event; resolve a manual-review payment operation and inspect its audit record.
- Confirm Fumadocs, Orama search, blog routes, and design-system gallery remain available.

## Gate 5: provider sandboxes

- Stripe test mode: card checkout, delayed asynchronous credit payment after local expiration, zero-value proration invoice void, full refund, partial refund, dispute creation/loss, and webhook replay.
- RevenueCat sandbox: signature rejection, normal subscription lifecycle, customer-support refund dead letter, and identity transfer. Verify that application credits do not move automatically.
- R2 test bucket: upload/list/delete by owner, cross-owner rejection, historical current-avatar adoption, and URL compatibility without rewriting provider paths.

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
