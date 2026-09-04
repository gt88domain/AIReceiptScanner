/**
 * Storage Module
 *
 * Provider-agnostic storage abstraction for file upload, download, and management.
 */

import { resolveCommonConfig } from "@repo/app-config/config";
import { createR2StorageProvider } from "./providers/r2";
import type { StorageProvider, StorageProviderKey } from "./types";

export {
  getAllowedFileTypes,
  getKeyFromUrl,
  getMaxFileSize,
  parseStoragePath,
  parseStoragePublicUrl,
  getPublicUrl,
  getStoragePublicBaseUrl,
  getUserStoragePrefix,
  getUserStoragePrefixes,
  isAllowedFileSize,
  isAllowedFileType,
} from "@repo/app-config/storage";
// Types
export type {
  ListOptions,
  ListResult,
  PutOptions,
  StorageData,
  StorageHttpMetadata,
  StorageObject,
  StorageObjectBody,
  StorageObjectMeta,
  StorageProvider,
  StorageProviderKey,
} from "./types";
// Utilities
export { generateStorageKey, sniffImageContentType } from "./utils";
export { isStorageEnabled } from "./access";

const r2ProviderCache = new WeakMap<R2Bucket, StorageProvider>();

export type StorageProviderOptions = {
  storage: R2Bucket;
  provider?: StorageProviderKey;
};

export function resolveStorageProviderKey(provider?: StorageProviderKey): StorageProviderKey {
  return provider ?? resolveCommonConfig().storage.provider;
}

/**
 * Get storage provider based on configuration
 *
 * @param options - Options containing storage bucket
 * @returns Storage provider instance
 *
 * @example
 * ```typescript
 * const provider = getStorageProvider({ storage: env.STORAGE });
 * await provider.put('key', data);
 * ```
 */
export function getStorageProvider({ storage, provider }: StorageProviderOptions): StorageProvider {
  const providerKey = resolveStorageProviderKey(provider);

  if (providerKey === "r2") {
    const cached = r2ProviderCache.get(storage);
    if (cached) {
      return cached;
    }

    const provider = createR2StorageProvider({ bucket: storage });
    r2ProviderCache.set(storage, provider);
    return provider;
  }

  throw new Error(`Storage provider not registered: ${providerKey}`);
}
