import type { ProductFeatures } from "@repo/app-config";

type JobWorkerHandlers = {
  fetch: ExportedHandler<Cloudflare.Env>["fetch"];
  scheduled: (controller: ScheduledController, env: Cloudflare.Env) => Promise<void>;
  queue: (batch: MessageBatch, env: Cloudflare.Env) => Promise<void>;
};

type OptionalJobWorkerHandlers = {
  fetch: JobWorkerHandlers["fetch"];
  scheduled?: JobWorkerHandlers["scheduled"];
  queue?: JobWorkerHandlers["queue"];
};

/** Builds the exact Worker surface permitted by the resolved feature contract. */
export function buildWorkerHandler(
  features: ProductFeatures,
  handlers: OptionalJobWorkerHandlers,
): OptionalJobWorkerHandlers {
  if (!features.jobs) return { fetch: handlers.fetch };
  if (!handlers.scheduled || !handlers.queue) {
    throw new Error("Jobs are enabled but Worker handlers are not registered.");
  }
  return { fetch: handlers.fetch, scheduled: handlers.scheduled, queue: handlers.queue };
}
