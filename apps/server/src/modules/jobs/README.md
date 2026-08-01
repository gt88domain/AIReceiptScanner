# Async jobs

Use a Job for short, retryable background work such as AI generation, image
processing, or exports. A request creates a durable D1 `job` and outbox record;
the outbox publishes only the job id to Cloudflare Queues. The consumer records
`pending`, `running`, `succeeded`, `failed`, or `cancelled` state in D1.

Create the queue before deploying the Worker:

```bash
pnpm exec wrangler queues create tanstack-template-jobs
```

Register a handler in `index.ts`, from the owning product module. Handlers must
be idempotent because Cloudflare Queues delivers at least once. Store large
inputs and outputs in R2 and place only references in `payload` or `result`.

Use Cloudflare Workflows directly—not this module—for long-lived, multi-step,
sleeping, or human-approval processes. Do not add a generic workflow wrapper.
