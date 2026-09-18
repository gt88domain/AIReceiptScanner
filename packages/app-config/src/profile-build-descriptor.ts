import {
  resolveCommonConfig,
  resolveNativeCommonConfig,
  resolveWebCommonConfig,
} from "./app-config";
import { resolveConfiguredPaymentProviders } from "./payment-providers";
import { createPlatformComposition, type PlatformComposition } from "./platform-composition";
import { createProductProfile, type ProductProfileId } from "./product-profiles";
import { resolveProductFeatures, type ProductResource } from "./features";
import type { ServerPaymentProviderKey } from "./types";

export type ProfileBuildDescriptor = Readonly<{
  profileId: ProductProfileId | "default-product";
  composition: PlatformComposition;
  requiredResources: readonly ProductResource[];
  configuredPaymentProviders: readonly ServerPaymentProviderKey[];
  checksum: string;
}>;

function checksum(input: string) {
  let value = 0x811c9dc5;
  for (const character of input) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(16).padStart(8, "0");
}

function descriptor(
  profileId: ProfileBuildDescriptor["profileId"],
  composition: PlatformComposition,
) {
  const web = resolveWebCommonConfig();
  const native = composition.features.mobile ? resolveNativeCommonConfig() : undefined;
  const configuredPaymentProviders = Object.freeze(
    resolveConfiguredPaymentProviders({
      features: composition.features,
      webPayments: web.payments,
      webCredits: web.credits,
      nativePayments: native?.payments,
      nativeCredits: native?.credits,
    }),
  );
  const requiredResources = Object.freeze([...composition.resources]);
  return Object.freeze({
    profileId,
    composition,
    requiredResources,
    configuredPaymentProviders,
    checksum: checksum(
      JSON.stringify({ profileId, composition, requiredResources, configuredPaymentProviders }),
    ),
  });
}

/** Creates the canonical build input for an official profile without changing product configuration. */
export function createProfileBuildDescriptor(profileId: ProductProfileId): ProfileBuildDescriptor {
  return descriptor(
    profileId,
    createPlatformComposition({
      features: createProductProfile(profileId),
      featureCapabilities: resolveCommonConfig().featureCapabilities,
    }),
  );
}

/** Creates the canonical descriptor for the repository's configured default product. */
export function createDefaultProductDescriptor(): ProfileBuildDescriptor {
  // Resolve all common config before exposing a descriptor, so invalid default config still fails closed.
  resolveCommonConfig();
  return descriptor(
    "default-product",
    createPlatformComposition({
      features: resolveProductFeatures(),
      featureCapabilities: resolveCommonConfig().featureCapabilities,
    }),
  );
}
