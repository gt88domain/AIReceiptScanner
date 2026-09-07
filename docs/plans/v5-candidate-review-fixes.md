# v5 candidate review fixes

Status: implementation complete; cross-review complete; focused tests authored; test execution not authorized.

## Core goal

Resolve the confirmed v5 candidate review findings without changing product policy or introducing new infrastructure. Preserve payment idempotency, catalog identity, webhook ordering, job recovery, audit completeness, and mobile route stability.

## Acceptance criteria

- Payment operation recovery replays the same provider inputs as the original request and stores internal price IDs in local billing state.
- Stripe lifetime validation applies consistently to PaymentIntent and Checkout completion paths.
- Replayed current purchase events can repair a missing cancellation outbox effect without accepting stale events.
- Checkout completion cannot downgrade a newer subscription lifecycle state.
- Processed webhook inbox rows remain the durable idempotency barrier until an archival/tombstone design exists.
- PAYMENTS_PRICE_ENV is used consistently by membership and credit catalogs and appears in shipped runtime/profile validation.
- Jobs reaching the DLQ become recoverable through the existing admin action.
- A failed ticket notification cannot make a committed reply appear failed or skip its audit record.
- Mobile security Hooks remain unconditional and the registration policy control opens the configured legal route.
- Stripe setup guidance describes explicit PAYMENTS_PRICE_ENV selection.

## Implementation phases

1. Payment recovery request identity and replay: `apps/server/src/payments/application`.
2. Stripe webhook validation, ordering, repair, and retention: `apps/server/src/payments/providers`, billing repository, and worker wiring.
3. Runtime/config consistency: app config, profile configs, preview config, and production/profile validation.
4. Jobs, tickets, mobile UI, and payment skill documentation.
5. Review the complete diff against this plan and correct implementation gaps.
6. Add focused automated tests only after implementation review passes.

## Authored test coverage

- Recover a persisted subscription upgrade after provider success and assert local `priceId` remains the internal catalog ID; include legacy v1 operation data.
- Recover an unissued Checkout and assert trial, customer reference, and email match the original request.
- Fail cancellation-outbox insertion after a purchase upsert, replay the exact event, and assert one outbox row exists; stale events must not enqueue.
- Deliver subscription and Checkout events in both orders, including same-second IDs, and assert lifecycle state remains authoritative.
- Assert both Stripe success event types reject lifetime catalog amount/currency mismatch.
- Processed webhook retention is enforced structurally by removing the purge function and scheduled call; no destructive test hook remains.
- Production validation self-check covers missing and non-production payment-price environments; shipped profile and preview examples declare the variable.
- Send a job with a delivery budget lower than `maxAttempts` to DLQ and assert it becomes admin-retryable without overwriting an active lease.
- The existing ticket integration test asserts the reply and audit record together; the mutation now uses one D1 batch and email delivery is outside it. The current test harness has no reliable email failure injection.
- Mobile Hook ordering and legal links were cross-reviewed statically; the current mobile test harness has no route-transition renderer.

Recommended commands after explicit authorization: focused server integration tests, mobile type check, `pnpm docs:facts-check`, `pnpm check-types`, then `pnpm test`.
