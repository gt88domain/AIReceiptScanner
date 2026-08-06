# Asynchronous Reliability

Jobs, webhook inbox records, and billing outbox records are durable D1 state
machines. Their Queue and Cron triggers are at-least-once delivery mechanisms,
not their source of truth.

## Ownership and recovery

Each worker atomically claims a due row with a random lease token and expiry.
Only that token may mark it completed, release it for retry, publish it, or
record an alert. If the lease expires, one later worker may reclaim it; the
earlier worker's late mutation is ignored. Jobs with legacy null leases are
reclaimable after the legacy lock window.

The Jobs-on Worker runs Cron every minute and consumes the main Queue one
message at a time. A durable job outbox stays `publishing` until its owning
token records success or failure. Webhook and billing retries use bounded
exponential backoff; their provider business logic and idempotency contracts
are unchanged.

## Release rollout

1. Apply the single additive D1 migration before deploying this Worker.
2. Deploy the Worker with the one-minute Cron and main Queue batch size of one.
3. Watch queue backlog, expired leases, pending webhook events, billing outbox
   retries, and unresolved DLQ events during the first operating window.
4. Do not apply a production migration or deploy from the template repository
   automatically; use the product's approved production safety preflight.
