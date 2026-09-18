import { createDb } from "@/db";
import { resolveJobQueue } from "@/lib/jobs-binding";
import type { ServerRuntimeConfig } from "@/lib/runtime-config";
import { resolveStorageBinding } from "@/lib/storage-binding";
import type { ControlReadDependencies } from "./read-models";

/** Builds only the dependencies that authoritative control reads actually consume. */
export function createControlReadDependencies(
  env: Cloudflare.Env,
  runtimeConfig: ServerRuntimeConfig,
): ControlReadDependencies {
  return {
    db: createDb(env.DB),
    env,
    runtimeConfig,
    storage: resolveStorageBinding(runtimeConfig.features, env),
    jobs: resolveJobQueue(runtimeConfig.features, env),
  };
}
