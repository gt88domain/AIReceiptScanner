# Add a job handler

Register the handler in `apps/server/src/modules/jobs`; make it idempotent with
the job idempotency key and persist external-effect state before retrying. Use a
Queue Job for retryable work and a Workflow for multi-step or human-waiting
work. Add success, retry, duplicate-delivery, and DLQ tests. Do not call an AI
provider directly from a request route for long work.
