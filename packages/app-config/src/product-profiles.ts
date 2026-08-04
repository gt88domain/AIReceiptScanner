import {
  createProductFeatures,
  validateFeatureDependencies,
  type ProductFeatureInput,
  type ProductFeatures,
} from "./features";

export type ProductProfileId = "full-saas" | "account-app" | "directory";

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
  expectedResources: readonly ("D1" | "R2" | "Queue" | "DLQ" | "Cron")[];
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
    expectedResources: ["D1", "R2", "Queue", "DLQ", "Cron"],
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
    expectedResources: ["D1", "R2", "Queue", "DLQ", "Cron"],
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
    expectedResources: ["D1", "Queue", "DLQ", "Cron"],
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
