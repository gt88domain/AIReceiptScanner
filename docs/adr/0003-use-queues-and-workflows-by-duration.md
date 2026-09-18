# Use Queues and Workflows by execution shape

## Decision

Use the Jobs module and Cloudflare Queues for short, retryable background work.
Use Cloudflare Workflows directly for multi-step, sleeping, or human-approval
processes. Do not wrap Workflows in a generic template abstraction.

## Why

Queue delivery is at least once, so Jobs persist state, outbox publication, DLQ
events, and external-effect idempotency keys. Workflows persist individual steps
and are appropriate when retrying an entire single-step job would be incorrect.

## Consequences

- AI generation, email, imports, exports, and asset processing start as Jobs.
- Product handlers must use `JobHandlerInput.idempotencyKey` for external side
  effects; a completed job state alone cannot undo a provider call after a
  Worker crash.
- Long-running work must not be kept alive with HTTP requests or `waitUntil`.
