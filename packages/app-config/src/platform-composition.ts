import {
  resolveProductFeatures,
  resolveRequiredResources,
  validateFeatureDependencies,
  type ProductFeatures,
  type ProductResource,
} from "./features";
import { resolveCommonConfig } from "./app-config";
import { createProductProfile } from "./product-profiles";
import { productProfileDefinitions, type ProductProfileId } from "./profile-definitions";
import { resolveProfileBuildId } from "./profile-build-env";
import type { FeatureCapabilityConfig } from "./types";

export type PlatformCompositionInput = Readonly<{
  features: ProductFeatures;
  featureCapabilities: Readonly<Record<string, FeatureCapabilityConfig>>;
}>;

/**
 * The one derived module contract shared by the API Worker, public web runtime,
 * profile validation, and deployment preflight. Product configuration owns only
 * feature choices; no caller may hand-maintain this module matrix.
 */
export type PlatformComposition = Readonly<{
  features: ProductFeatures;
  resources: readonly ProductResource[];
  modules: Readonly<{
    admin: Readonly<{
      core: boolean;
      audit: boolean;
      jobs: boolean;
      billing: boolean;
    }>;
    jobs: boolean;
    storage: boolean;
    tickets: boolean;
    billing: boolean;
    credits: boolean;
    webBilling: boolean;
    webCredits: boolean;
    webCreditPurchases: boolean;
    nativeBilling: boolean;
    nativeCredits: boolean;
  }>;
}>;

/** Derives every platform registration decision from one validated feature contract. */
export function createPlatformComposition({
  features,
  featureCapabilities,
}: PlatformCompositionInput): PlatformComposition {
  const resolved = validateFeatureDependencies(features);
  if (!resolved.billing) {
    const paidCapability = Object.entries(featureCapabilities).find(
      ([, requirement]) => requirement.minimumTier !== "free",
    );
    if (paidCapability) {
      throw new Error(
        `[composition:PAID_CAPABILITY_REQUIRES_BILLING] ${paidCapability[0]} requires ${paidCapability[1].minimumTier}.`,
      );
    }
  }
  const admin = resolved.admin;
  return Object.freeze({
    features: resolved,
    resources: Object.freeze([...resolveRequiredResources(resolved)]),
    modules: Object.freeze({
      admin: Object.freeze({
        core: admin,
        audit: admin,
        jobs: admin && resolved.jobs,
        billing: admin && resolved.billing,
      }),
      jobs: resolved.jobs,
      storage: resolved.storage,
      tickets: resolved.tickets,
      billing: resolved.billing,
      credits: resolved.credits,
      webBilling: resolved.web.billing,
      webCredits: resolved.web.credits,
      webCreditPurchases: resolved.web.creditPurchases,
      nativeBilling: resolved.native.billing,
      nativeCredits: resolved.native.credits,
    }),
  });
}

/** Resolves the immutable composition used by the default product Worker. */
export function resolvePlatformComposition(): PlatformComposition {
  const featureCapabilities = resolveCommonConfig().featureCapabilities;
  const profileId = resolveProfileBuildId();
  if (!profileId) {
    return createPlatformComposition({ features: resolveProductFeatures(), featureCapabilities });
  }
  if (!(profileId in productProfileDefinitions)) {
    throw new Error(`[composition:UNKNOWN_PROFILE] ${profileId} is not an official profile.`);
  }
  return createPlatformComposition({
    features: createProductProfile(profileId as ProductProfileId),
    featureCapabilities,
  });
}
