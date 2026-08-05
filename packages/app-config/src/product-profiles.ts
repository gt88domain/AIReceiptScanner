import {
  createProductFeatures,
  resolveRequiredResources,
  validateFeatureDependencies,
  type ProductFeatureInput,
  type ProductFeatures,
} from "./features";

export type ProductProfileId = "full-saas" | "account-app" | "directory" | "directory-lite";

type PlatformFeatureOverrides = Partial<ProductFeatureInput["web"]>;

/** Small, explicit overrides for a profile; provider details stay in appConfig. */
export type ProductFeatureOverrides = Partial<
  Pick<ProductFeatureInput, "admin" | "jobs" | "mobile" | "storage">
> & {
  web?: PlatformFeatureOverrides;
  native?: Partial<ProductFeatureInput["native"]>;
};

export type ProductProfile = {
  id: ProductProfileId;
  label: string;
  description: string;
  features: ProductFeatures;
  expectedResources: ReturnType<typeof resolveRequiredResources>;
};

const noNativeFeatures = { billing: false, credits: false, creditPurchases: false } as const;

function defineProductProfile(
  id: ProductProfileId,
  label: string,
  description: string,
  input: ProductFeatureInput,
): ProductProfile {
  const features = createProductFeatures(input);
  return {
    id,
    label,
    description,
    features,
    expectedResources: resolveRequiredResources(features),
  };
}

/**
 * Official, additive starting points for new products. They never alter the
 * repository's default appConfig or create Cloudflare resources.
 */
export const productProfiles: Record<ProductProfileId, ProductProfile> = {
  "full-saas": defineProductProfile(
    "full-saas",
    "Full SaaS",
    "Billing, Credits, Storage, and Jobs for a subscription or AI SaaS.",
    {
      admin: true,
      jobs: true,
      storage: true,
      mobile: false,
      web: { billing: true, credits: true, creditPurchases: true },
      native: noNativeFeatures,
    },
  ),
  "account-app": defineProductProfile(
    "account-app",
    "Account App",
    "Accounts, private content, Storage, Admin, and Jobs without commercial billing.",
    {
      admin: true,
      jobs: true,
      storage: true,
      mobile: false,
      web: { billing: false, credits: false, creditPurchases: false },
      native: noNativeFeatures,
    },
  ),
  directory: defineProductProfile(
    "directory",
    "Directory",
    "Directory or content platform with Admin and Jobs, without Storage or billing.",
    {
      admin: true,
      jobs: true,
      storage: false,
      mobile: false,
      web: { billing: false, credits: false, creditPurchases: false },
      native: noNativeFeatures,
    },
  ),
  "directory-lite": defineProductProfile(
    "directory-lite",
    "Directory Lite",
    "Directory or content platform with Admin, without Jobs, Storage, or billing.",
    {
      admin: true,
      jobs: false,
      storage: false,
      mobile: false,
      web: { billing: false, credits: false, creditPurchases: false },
      native: noNativeFeatures,
    },
  ),
};

/** Creates a validated profile contract without mutating application configuration. */
export function createProductProfile(
  profileId: ProductProfileId,
  overrides: ProductFeatureOverrides = {},
): ProductFeatures {
  const base = productProfiles[profileId].features;

  return validateFeatureDependencies(
    createProductFeatures({
      admin: overrides.admin ?? base.admin,
      jobs: overrides.jobs ?? base.jobs,
      mobile: overrides.mobile ?? base.mobile,
      storage: overrides.storage ?? base.storage,
      web: { ...base.web, ...overrides.web },
      native: { ...base.native, ...overrides.native },
    }),
  );
}
