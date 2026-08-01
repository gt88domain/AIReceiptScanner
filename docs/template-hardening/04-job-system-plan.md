# 04 — Job system plan

## Existing baseline

The template already has the correct short-job shape:

```text
API command
  -> D1 job + job_outbox (one durable batch)
  -> Queue message { jobId }
  -> Worker consumer claims durable job
  -> idempotent product handler
  -> succeeded / retry / failed
  -> Cloudflare DLQ
  -> failed_job_event + admin retry/ignore/refund decision
```

`job.idempotency_key` is unique and a canonical payload hash rejects reuse of a
key with changed input. Queue delivery is at least once; handlers therefore
receive the stable job ID and must make their provider effects idempotent.

The current generic types are `email.send`, `ai.generate`, `import.run`, and
`asset.process`; products may register namespaced types. The requested
`data.export` name is not currently a built-in suggestion and should be added
only in the focused jobs PR. Current states are `pending`, `running`,
`succeeded`, `failed`, and `cancelled`.

## Boundaries

- Use Jobs for bounded, retryable work: email, generation, imports, exports,
  and asset processing.
- Use Cloudflare Workflows directly for long-lived, multi-step, sleep-heavy,
  compensation, or human-approval processes. Do not build a generic Workflow
  wrapper.
- Queue messages carry only `jobId`; payload/result references can point to D1
  or R2, but large bytes do not enter Queue messages or job events.
- Job handlers belong to the owning product module and are registered during
  API Worker startup. The template must not contain fake business handlers.

## Gaps to close in `hardening/jobs-system`

1. Formalize the public JobType vocabulary, including `data.export`, while
   retaining namespaced product types.
2. Add a production operations contract: metrics/log event names, backlog and
   DLQ alert thresholds, owner, runbook, and retry/refund decision record.
3. Test the real Worker `queue()` routing and startup registration path in
   addition to the existing idempotency/DLQ service tests.
4. Define cancellation semantics for a handler already running: cancellation
   prevents later execution but cannot undo a completed external effect.
5. Decide idempotency-key scope explicitly (global today). If owner/type scope
   is desired, migrate it deliberately with a compatibility plan.

## Acceptance criteria for that PR

- A duplicate request creates one durable job and one provider effect.
- Missing handlers produce a diagnosable terminal failure and reach DLQ after
  configured Queue retries.
- DLQ persistence is idempotent; an allowlisted admin can retry or ignore it,
  and the action is audited.
- Invalid queue messages are acknowledged safely; transient persistence errors
  retry without losing a job.
- The queue, DLQ, worker binding, and preflight identities are documented and
  exercised by focused tests.

This document is a plan, not a request to add a handler or enqueue product work.
