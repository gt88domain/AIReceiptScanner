# Async jobs

Use a Job for short, retryable background work such as AI generation, image
processing, or exports. A request creates a durable D1 `job` and outbox record;
the outbox publishes the job id and its delivery-generation `outboxId` to Cloudflare Queues. The consumer records
`pending`, `running`, `succeeded`, `failed`, or `cancelled` state in D1.

Create both queues before deploying the Worker:

```bash
pnpm exec wrangler queues create <production-job-queue>
pnpm exec wrangler queues create <production-job-queue-dlq>
```

Register a handler from the owning product module during Worker startup:

```ts
import { registerJobHandler } from "@/modules/jobs";

registerJobHandler("novel.chapter.generate", async ({ idempotencyKey, payload }) => {
  // Give every provider-facing operation a stable, namespaced idempotency key.
  const providerIdempotencyKey = `${idempotencyKey}:generation`;
  return { revisionId: String(payload.revisionId) };
});
```

Import that registration file from `apps/server/src/modules/index.ts`; otherwise
the Worker will not evaluate it at startup and the job will correctly fail into
the DLQ as an unregistered type.

The registry suggests `email.send`, `ai.generate`, `asset.process`,
`data.import`, and `data.export`; products use their own namespaced types.
Handlers must be idempotent because Cloudflare Queues delivers at least once.
Store large inputs and outputs in R2 and place only references in `payload` or
`result`.

## External-effect idempotency contract

`JobHandlerInput.idempotencyKey` is durable and does not change when a Queue
message is retried. Every provider-facing side effect (AI generation, email,
payment, webhook, or third-party write) must use a deterministic namespaced
form such as `${idempotencyKey}:email` as that provider's idempotency key or
external reference. Do not use the delivery count, a timestamp, or a newly
generated UUID.

If a provider does not support idempotency keys, the owning domain must persist
its own provider-operation record with a unique job/effect key and reconcile it
before retrying. A job's `succeeded` state is recorded after the handler
returns, so it cannot by itself prevent a provider call that succeeded just
before a Worker crash.

Every call to `context.jobs.create` requires a caller-generated
`idempotencyKey`. The database stores a canonical `payloadHash` and rejects a
key reused for different input, so repeated browser submissions return the same
job instead of creating duplicate AI work or charges.

After three failed main-queue deliveries, Cloudflare moves the message to
the configured DLQ. Its consumer writes one `failed_job_event` row;
admins can list, retry, or ignore unresolved events. A refund is intentionally
domain-owned: perform the verified credit/payment refund first, then mark the
event `refunded` with `resolveFailedJobEvent`.

Future `runAfter` jobs stay in the durable outbox until the scheduled dispatcher
finds them due. Early deliveries are parked back in the outbox and acknowledged,
without consuming the Queue retry budget. Admin retry rotates `outboxId`; both
the main consumer and DLQ reject old generations. Legacy messages without this
field are accepted only before the first generation-aware admin retry. Deploy
the producer and both consumers together; an old consumer cannot enforce this
generation contract. DLQ terminalization and incident history are transactional.
An accepted admin retry, its queued event and audit are committed together;
temporary publish failure leaves the outbox for the scheduled dispatcher.

Use Cloudflare Workflows directly—not this module—for long-lived, multi-step,
sleeping, or human-approval processes. Do not add a generic workflow wrapper.

## Operations

The D1 records are the operational source of truth. Monitor the Cloudflare
Queue backlog/oldest-message age and query unresolved `failed_job_event` rows.
Assign an on-call owner and alert when either grows beyond the product's stated
latency objective. The template does not invent an alert provider or a generic
refund action.

When an event reaches the DLQ, inspect the durable job/error, correct the
underlying issue, then use the admin retry action. Ignore only with a recorded
reason. Refund is domain-owned: complete the verified credit/payment refund
first, then resolve the failed-job event as `refunded`. A cancellation prevents
later job-state completion, but cannot undo an external provider effect that
already finished; product handlers must make those effects idempotent.
