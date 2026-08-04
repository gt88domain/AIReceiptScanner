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

/**
 * Official, additive starting points for new products. They never alter the
 * repository's default appConfig or create Cloudflare resources.
 */
export const productProfiles: Record<ProductProfileId, ProductProfile> = {
  "full-saas": {
    id: "full-saas",
    label: "Full SaaS",
    description: "Billing, Credits, Storage, and Jobs for a subscription or AI SaaS.",
    features: createProductFeatures({
      admin: true,
      jobs: true,
      storage: true,
      mobile: false,
      web: { billing: true, credits: true, creditPurchases: true },
      native: noNativeFeatures,
    }),
    expectedResources: resolveRequiredResources(
      createProductFeatures({
        admin: true,
        jobs: true,
        storage: true,
        mobile: false,
        web: { billing: true, credits: true, creditPurchases: true },
        native: noNativeFeatures,
      }),
    ),
  },
  "account-app": {
    id: "account-app",
    label: "Account App",
    description: "Accounts, private content, Storage, Admin, and Jobs without commercial billing.",
    features: createProductFeatures({
      admin: true,
      jobs: true,
      storage: true,
      mobile: false,
      web: { billing: false, credits: false, creditPurchases: false },
      native: noNativeFeatures,
    }),
    expectedResources: resolveRequiredResources(
      createProductFeatures({
        admin: true,
        jobs: true,
        storage: true,
        mobile: false,
        web: { billing: false, credits: false, creditPurchases: false },
        native: noNativeFeatures,
      }),
    ),
  },
  directory: {
    id: "directory",
    label: "Directory",
    description: "Directory or content platform with Admin and Jobs, without Storage or billing.",
    features: createProductFeatures({
      admin: true,
      jobs: true,
      storage: false,
      mobile: false,
      web: { billing: false, credits: false, creditPurchases: false },
      native: noNativeFeatures,
    }),
    expectedResources: resolveRequiredResources(
      createProductFeatures({
        admin: true,
        jobs: true,
        storage: false,
        mobile: false,
        web: { billing: false, credits: false, creditPurchases: false },
        native: noNativeFeatures,
      }),
    ),
  },
  "directory-lite": {
    id: "directory-lite",
    label: "Directory Lite",
    description: "Directory or content platform with Admin, without Jobs, Storage, or billing.",
    features: createProductFeatures({
      admin: true,
      jobs: false,
      storage: false,
      mobile: false,
      web: { billing: false, credits: false, creditPurchases: false },
      native: noNativeFeatures,
    }),
    expectedResources: resolveRequiredResources(
      createProductFeatures({
        admin: true,
        jobs: false,
        storage: false,
        mobile: false,
        web: { billing: false, credits: false, creditPurchases: false },
        native: noNativeFeatures,
      }),
    ),
  },
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
