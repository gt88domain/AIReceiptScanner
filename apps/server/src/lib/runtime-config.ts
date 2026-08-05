import {
  resolvePlatformComposition,
  resolveEmailConfig,
  resolveStorageConfig,
  type PlatformComposition,
  type ProductFeatures,
  type ResolvedEmailConfig,
  type ResolvedStorageConfig,
} from "@repo/app-config";
export type ResolvedOriginConfig = Readonly<{
  webRuntimeOrigin: string;
  webCanonicalOrigin: string;
  apiRuntimeOrigin: string;
  authPublicOrigin: string;
  authTrustedOrigins: readonly string[];
}>;

export type ServerRuntimeConfig = Readonly<{
  composition: PlatformComposition;
  features: ProductFeatures;
  storage: ResolvedStorageConfig;
  email: ResolvedEmailConfig;
}>;

/** Resolves immutable product capability contracts once for this Worker isolate. */
export function resolveServerRuntimeConfig(): ServerRuntimeConfig {
  const composition = resolvePlatformComposition();
  const features = composition.features;
  const storage = resolveStorageConfig();
  const email = resolveEmailConfig();
  if (features.storage !== storage.enabled) {
    throw new Error(
      "[runtime:STORAGE_CONFIG_MISMATCH] Storage feature and storage config disagree.",
    );
  }
  return Object.freeze({ composition, features, storage, email });
}

/** Resolves request-independent origin semantics from the current Worker binding set. */
export function resolveOriginConfig(
  env: Pick<Cloudflare.Env, "WEBSITE_URL" | "SERVER_URL">,
): ResolvedOriginConfig {
  const webRuntimeOrigin = env.WEBSITE_URL;
  const apiRuntimeOrigin = env.SERVER_URL;
  return Object.freeze({
    webRuntimeOrigin,
    webCanonicalOrigin: webRuntimeOrigin,
    apiRuntimeOrigin,
    authPublicOrigin: apiRuntimeOrigin,
    authTrustedOrigins: Object.freeze([webRuntimeOrigin].filter(Boolean)),
  });
}
