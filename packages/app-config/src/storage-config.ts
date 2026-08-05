import { resolveCommonConfig } from "./app-config";
import type { StorageProviderKey } from "./types";

export type ResolvedStorageConfig = Readonly<{
  enabled: boolean;
  provider: StorageProviderKey;
  publicPath: string;
}>;

/** Resolves the storage capability once without touching a Worker binding. */
export function resolveStorageConfig(common = resolveCommonConfig()): ResolvedStorageConfig {
  const { storage } = common;
  return Object.freeze({
    enabled: storage.enabled === true,
    provider: storage.provider,
    publicPath: storage.publicPath,
  });
}
