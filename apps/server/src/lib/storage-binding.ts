import type { ProductFeatures } from "@repo/app-config";

type StorageBindings = Pick<Cloudflare.Env, "STORAGE">;

/** Reads R2 only after the immutable product capability contract permits it. */
export function resolveStorageBinding(features: ProductFeatures, env: StorageBindings) {
  if (!features.storage) return undefined;
  if (!env.STORAGE) throw new Error("Storage is enabled but STORAGE is not configured.");
  return env.STORAGE;
}
