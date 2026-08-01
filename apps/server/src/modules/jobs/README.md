# Async jobs

Use a Job for short, retryable background work such as AI generation, image
processing, or exports. A request creates a durable D1 `job` and outbox record;
the outbox publishes only the job id to Cloudflare Queues. The consumer records
`pending`, `running`, `succeeded`, `failed`, or `cancelled` state in D1.

Create both queues before deploying the Worker:

```bash
pnpm exec wrangler queues create tanstack-template-jobs
pnpm exec wrangler queues create tanstack-template-jobs-dlq
```

Register a handler from the owning product module during Worker startup:

```ts
import { registerJobHandler } from "@/modules/jobs";

registerJobHandler("novel.chapter.generate", async ({ id, payload }) => {
  // Make the provider call idempotent using `id`.
  return { revisionId: String(payload.revisionId) };
});
```

Import that registration file from `apps/server/src/modules/index.ts`; otherwise
the Worker will not evaluate it at startup and the job will correctly fail into
the DLQ as an unregistered type.

The registry suggests `email.send`, `ai.generate`, `import.run`, and
`asset.process`; products use their own namespaced types. Handlers must be
idempotent because Cloudflare Queues delivers at least once. Store large inputs
and outputs in R2 and place only references in `payload` or `result`.

After three failed main-queue deliveries, Cloudflare moves the message to
`tanstack-template-jobs-dlq`. Its consumer writes one `failed_job_event` row;
admins can list, retry, or ignore unresolved events. A refund is intentionally
domain-owned: perform the verified credit/payment refund first, then mark the
event `refunded` with `resolveFailedJobEvent`.

Use Cloudflare Workflows directly—not this module—for long-lived, multi-step,
sleeping, or human-approval processes. Do not add a generic workflow wrapper.
