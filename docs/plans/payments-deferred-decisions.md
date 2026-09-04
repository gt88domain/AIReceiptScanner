# Payments deferred decisions

Status: implementation and independent static review complete; focused tests authored but not run.

## Implemented

- PAY-104: a verified late provider success may complete an expired immutable credit order after the existing provider, session, payment, amount, and currency checks pass.
- PAY-105: administrators can close a manual-review operation as failed, or requeue it only when the provider operation has native idempotency, remains inside a conservative 23-hour provider guarantee window, and no newer active operation owns the same scope. The operation-claim boundary enforces the same deadline for automatic, ordinary, and administrator-approved retries before any provider call; an expired operation is isolated without aborting the remaining recovery batch. Requeue restores a bounded retry budget. Successful resolutions preserve the original reason in the audit log. Provider-specific success reconciliation remains a webhook/replay responsibility.
- PAY-106: Stripe subscription or unknown refunds/disputes no longer disappear silently. They become non-retryable webhook dead letters for administrator review; the code does not guess at an automatic subscription transition without invoice/subscription evidence.
- PAY-111: `invoice.voided` is ignored and no longer marks a subscription unpaid.
- PAY-114: RevenueCat subscription refunds with `cancel_reason=CUSTOMER_SUPPORT` become visible manual-review events. Existing subscription/purchase identity transfer records remain unchanged.
- PAY-120: administrators have a bounded cursor-paginated dead-letter listing that works with the existing audited replay procedure. A reviewed event can also be acknowledged without replay, with its original failure recorded in the audit log.
- PAY-125: the existing array response shape remains as a compatibility endpoint, with an intentional 100-row safety cap; old clients cannot receive both an unlimited response and bounded server work. A new purchase-history page endpoint is globally sorted and cursor-paginated, and the Web UI exposes previous/next navigation including recovery from a failed later page. The public comment now correctly says provider resource IDs, rather than provider names, stay server-side.

## Reviewed and intentionally unchanged

- PAY-101: the Server Worker already declares `NODE_ENV=production`, uses `nodejs_compat`, and has compatibility date `2026-07-14`. Cloudflare documents that bindings populate `process.env` by default after `2025-04-01`; production preflight already rejects a non-production `NODE_ENV` and placeholder/test production price IDs.
- PAY-109: Creem is archived and the active RevenueCat bearer comparison already uses constant-time comparison.
- PAY-114 transfer: RevenueCat transfers provider transactions and entitlements, not the application's consumed/spendable credit ledger. Moving credits automatically would create an unsupported cross-account asset transfer. Existing identity rows retain `transferEventId` as evidence.
- PAY-115: all active Stripe credit completion paths pass provider amount and currency. The reported missing callers belonged to archived providers; RevenueCat native purchase events do not provide a reliable minor-unit amount in the current contract.
- PAY-118: unchanged because partial recovery is explicitly routed to manual review and this item depends on excluded PAY-117. Replacing the ledger engine with full-only recovery would change money policy.
- PAY-122: no destructive retention was added. Deleting processed webhook IDs would remove both audit evidence and the idempotency barrier, allowing a sufficiently late replay to be processed again. A future retention design needs durable tombstones or external archival first.
- PAY-123: retained until there is evidence that the one-time legacy recovery audit has run against every deployed database.

## Deferred external or product decisions

- Automatic Stripe subscription revocation after a refund/dispute requires reliable charge-to-invoice-to-subscription evidence and an explicit access policy. The current safe outcome is a visible dead letter.
- Automatic RevenueCat credit transfer is not implemented because provider entitlement transfer does not define how already-consumed application credits move.
- No PAY-117 recommendation was implemented. Shared payment-operation and
  recovery files changed for PAY-105 and PAY-124, not for PAY-117's proposed
  layer removal.

## Test plan

Focused tests were authored after independent static review confirmed the implementation boundaries.

- Credit order: pending and expired orders complete exactly once; failed/refunded orders reject; amount/currency mismatch still rejects.
- Payment operation: native manual review can requeue; local-only manual review cannot requeue; either can be closed failed; stale status races do not resolve.
- Stripe: voided invoices do not mutate subscriptions; unknown/subscription refunds and disputes enter manual review; one-time and credit paths retain current behavior.
- RevenueCat: customer-support subscription refund enters manual review; lifetime and credit cancellation behavior remains unchanged.
- Admin: dead-letter listing is admin-only, bounded, stable across equal timestamps, and compatible with replay.
- Purchase history: owner filtering, global order, equal-timestamp cursor behavior, maximum page size, and next-cursor termination.

Do not run tests, builds, type checks, browser checks, or deploy checks until the user confirms the final consolidated test run.
