import type { ProductFeatures } from "@repo/app-config";

type JobsBindings = Pick<Cloudflare.Env, "JOB_QUEUE">;

/** Reads the Queue binding only for a Jobs-capable product. */
export function resolveJobQueue(features: ProductFeatures, env: JobsBindings): Queue | undefined {
  if (!features.jobs) return undefined;
  if (!env.JOB_QUEUE) throw new Error("Jobs are enabled but JOB_QUEUE is not configured.");
  return env.JOB_QUEUE;
}
