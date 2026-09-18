# oRPC and Cloudflare Worker boundaries

oRPC is the typed HTTP API between the Web Worker/optional mobile clients and the API
Worker. It is not a second business-runtime or a replacement for Queue,
Workflow, R2, or Durable Objects.

## Permitted paths

| Need | Standard path |
| --- | --- |
| Query or bounded mutation | oRPC procedure on the API Worker |
| Web SSR / server action | Web Worker calls the API Worker; it never owns business D1 or writes SQL |
| One-way, request-bound progress | oRPC async iterator/SSE, with abort cleanup and bounded payloads |
| Large uploads/downloads | R2 through the storage module; stream bytes instead of buffering them |
| Retryable, bounded async work | durable Job + Cloudflare Queue |
| Multi-step, sleeping, or approval work | Cloudflare Workflow directly |
| Coordinated bidirectional real time | dedicated Hono WebSocket route plus a Durable Object, proposed separately |

## Rules

- Normal oRPC handlers return a bounded JSON result. Validate every input and
  keep business logic in `apps/server/src/modules/<domain>`, not in the Web
  Worker or an oRPC router.
- TanStack Start server actions may mediate SSR or call the API, but must not
  receive a D1 binding, write business data, or bypass oRPC.
- Streaming is allowed only for client-visible, request-bound output. Use the
  request abort signal to stop provider work; do not buffer a provider response
  or file in Worker memory.
- AI generation, imports, exports, image processing, credit charging, and any
  work that must survive disconnects use Jobs. Return a job id and expose
  persisted status/results; do not keep the request open as a task runner.
- `ctx.waitUntil()` is only for non-critical work that can finish within its
  post-response limit. It is never a durable job queue.
- This template does not expose WebSockets through its oRPC handler. Add them
  only when a product has a coordination requirement, with a Durable Object,
  authentication, message-size limits, and lifecycle tests in a separate PR.

Cloudflare Workers stream HTTP responses, but each isolate has a 128 MB memory
limit. A stream remains request-bound: after the response completes or the
client disconnects, work may be cancelled. Queue consumers are at-least-once,
so their handlers must use the Job external-effect idempotency contract.

References: [Cloudflare Worker limits](https://developers.cloudflare.com/workers/platform/limits/),
[Streams](https://developers.cloudflare.com/workers/runtime-apis/streams/),
[Queues and Workflows guidance](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/),
and [oRPC HTTP handler](https://orpc.dev/docs/rpc-handler).
