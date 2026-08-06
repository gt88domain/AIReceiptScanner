# Fence asynchronous state transitions with lease tokens

## Decision

Every durable asynchronous state machine claims work with an opaque lease token.
The worker may complete, release, or publish only when its token still matches
the row. Expired leases may be claimed by a later worker; a late prior worker
then has no state-transition authority.

## Why

Cloudflare Queue delivery, Cron invocations, and Worker execution are all
at-least-once. A time lease alone prevents most overlap but cannot stop a
worker that finishes after its lease expires from overwriting the replacement
worker's result. Token-guarded mutations fence that stale writer.

## Consequences

- Jobs, job outbox publication, webhook inbox processing, billing outbox
  effects, alert delivery, and DLQ resolution use conditional token updates.
- External providers still receive a stable idempotency key where their APIs
  support one; fencing protects D1 state, not an already-started network call.
- Cron runs once per minute and the main Queue consumes one message per batch
  so short leases and operational recovery remain observable.
- New asynchronous domain state must define its owner token, expiration, and
  terminal mutation before adding a worker.
