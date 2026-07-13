import { resolveNativeCommonConfig, resolveWebCommonConfig } from "./app-config";
import type {
  CreditGrantConfig,
  CreditNativePackageConfig,
  CreditPackageConfig,
  CreditPackageStatus,
  CreditWebPackageConfig,
  NativePaymentProviderKey,
  ProviderPriceEnvironment,
  WebPaymentProviderKey,
} from "./types";

/** Native store platform that can expose purchasable credit packages. */
export type NativeCreditPlatform = "ios" | "android";

/** Raw credit configuration read from app-config before validation and normalization. */
export type CreditsConfig = {
  /** Enables or disables credit APIs and UI surfaces. */
  enabled?: boolean;
  /** Purchasable credit packages shared by web and native clients. */
  packages?: CreditPackageConfig[];
  /** Optional one-time free credits granted when a user first touches the ledger. */
  signupGrant?: CreditGrantConfig;
};

/** Normalized free-credit grant rule used by server-side ledger operations. */
export type NormalizedCreditGrant = {
  /** Whether the grant rule is active. */
  enabled: boolean;
  /** Number of credits granted by this rule. */
  amount: number;
  /** Expiration window in days; null means the grant does not expire. */
  expiresInDays: number | null;
};

/** Normalized web checkout package configuration for one credit package. */
export type NormalizedCreditWebPackage = {
  /** Payment provider that owns the web price. */
  provider: WebPaymentProviderKey;
  /** Provider-specific price id for the active environment. */
  providerPriceId: string;
  /** ISO currency code used by the provider price. */
  currency: string;
  /** Price amount in minor currency units. */
  amountCents: number;
  /** Lifecycle status for this web package price. */
  status: CreditPackageStatus;
};

/** Normalized native store product configuration for one credit package. */
export type NormalizedCreditNativePackage = {
  /** Native payment provider that owns the store product. */
  provider: NativePaymentProviderKey;
  /** Provider/store product id used to match RevenueCat events and offerings. */
  providerProductId: string;
  /** ISO currency code used by the store product. */
  currency: string;
  /** Product amount in minor currency units. */
  amountCents: number;
  /** Lifecycle status for this native package product. */
  status: CreditPackageStatus;
};

/** Normalized credit package available to web and/or native purchase flows. */
export type NormalizedCreditPackage = {
  /** Internal package id used across config, checkout metadata, and ledger rows. */
  id: string;
  /** Number of credits granted when this package is purchased. */
  amount: number;
  /** Lifecycle status for the package. */
  status: CreditPackageStatus;
  /** Web checkout package data, if this package is available on web. */
  web: NormalizedCreditWebPackage | null;
  /** Native store product data by platform. */
  native: Partial<Record<NativeCreditPlatform, NormalizedCreditNativePackage>>;
};

/** Fully normalized credit system config consumed by runtime code. */
export type NormalizedCreditsConfig = {
  /** Whether the credit system is enabled. */
  enabled: boolean;
  /** Validated purchasable packages. */
  packages: NormalizedCreditPackage[];
  /** Validated signup grant, if configured. */
  signupGrant: NormalizedCreditGrant | null;
};

/** Match returned when a web provider price id maps to a configured package. */
export type NormalizedWebCreditPackageMatch = {
  /** Matched credit package. */
  package: NormalizedCreditPackage;
  /** Matched web price configuration. */
  price: NormalizedCreditWebPackage;
};

/** Match returned when a native provider product id maps to a configured package. */
export type NormalizedNativeCreditPackageMatch = {
  /** Native platform that owns the matched product id. */
  platform: NativeCreditPlatform;
  /** Matched credit package. */
  package: NormalizedCreditPackage;
  /** Matched native product configuration. */
  product: NormalizedCreditNativePackage;
};

function assertMatchingPackageFields(existing: CreditPackageConfig, item: CreditPackageConfig) {
  if (
    existing.amount !== item.amount ||
    (existing.status ?? "active") !== (item.status ?? "active")
  ) {
    throw new Error(`[credits] Platform package definitions differ for package ${item.id}.`);
  }
}

function mergeCreditPackage(
  packageMap: Map<string, CreditPackageConfig>,
  item: CreditPackageConfig,
) {
  const existing = packageMap.get(item.id);
  if (!existing) {
    packageMap.set(item.id, {
      id: item.id,
      amount: item.amount,
      status: item.status,
      web: item.web,
      native: item.native,
    });
    return;
  }

  assertMatchingPackageFields(existing, item);
  packageMap.set(item.id, {
    ...existing,
    web: existing.web ?? item.web,
    native: {
      ...existing.native,
      ...item.native,
    },
  });
}

export function mergeCreditsConfigs(inputs: CreditsConfig[]): CreditsConfig {
  const enabledConfigs = inputs.filter((input) => input.enabled);
  const packageMap = new Map<string, CreditPackageConfig>();

  for (const input of enabledConfigs) {
    for (const item of input.packages ?? []) {
      mergeCreditPackage(packageMap, item);
    }
  }

  return {
    enabled: enabledConfigs.length > 0,
    packages: Array.from(packageMap.values()),
    signupGrant: enabledConfigs.find((input) => input.signupGrant)?.signupGrant,
  };
}

/**
 * Resolves the active web payment price environment from NODE_ENV.
 *
 * Web provider price IDs are environment-specific, while native product IDs are store-specific.
 */
function resolveProviderPriceEnvironment(): ProviderPriceEnvironment {
  const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
    ?.NODE_ENV;
  return nodeEnv === "production" ? "prod" : "test";
}

/** Throws when a configured credit amount or price amount is not a positive integer. */
function assertPositiveInteger(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`[credits] ${field} must be a positive integer.`);
  }
}

/** Throws when a configured package status is not a supported lifecycle value. */
function assertStatus(status: CreditPackageStatus | undefined, field: string) {
  if (status && status !== "active" && status !== "archived") {
    throw new Error(`[credits] Invalid status for ${field}.`);
  }
}

/** Normalizes an optional free-credit grant rule. */
function normalizeGrant(
  input: CreditGrantConfig | undefined,
  field: string,
): NormalizedCreditGrant | null {
  if (!input) {
    return null;
  }

  assertPositiveInteger(input.amount, `${field}.amount`);

  if (
    input.expiresInDays != null &&
    (!Number.isInteger(input.expiresInDays) || input.expiresInDays <= 0)
  ) {
    throw new Error(`[credits] ${field}.expiresInDays must be a positive integer.`);
  }

  return {
    enabled: input.enabled ?? true,
    amount: input.amount,
    expiresInDays: input.expiresInDays ?? null,
  };
}

/** Normalizes a web checkout price for a credit package. */
function normalizeWebPackage(
  input: CreditWebPackageConfig | undefined,
  packageId: string,
  providerPriceEnvironment: ProviderPriceEnvironment,
): NormalizedCreditWebPackage | null {
  if (!input) {
    return null;
  }

  assertStatus(input.status, `package ${packageId}.web`);
  assertPositiveInteger(input.amountCents, `package ${packageId}.web.amountCents`);

  const providerPriceId = input[providerPriceEnvironment]?.providerPriceId;
  if (!providerPriceId) {
    throw new Error(
      `[credits] ${providerPriceEnvironment}.providerPriceId is required for package ${packageId}.`,
    );
  }

  return {
    provider: input.provider,
    providerPriceId,
    currency: input.currency,
    amountCents: input.amountCents,
    status: input.status ?? "active",
  };
}

/** Normalizes a native store product for a credit package on one platform. */
function normalizeNativePackage(
  input: CreditNativePackageConfig | undefined,
  packageId: string,
  platform: NativeCreditPlatform,
): NormalizedCreditNativePackage | undefined {
  if (!input) {
    return undefined;
  }

  assertStatus(input.status, `package ${packageId}.native.${platform}`);
  assertPositiveInteger(input.amountCents, `package ${packageId}.native.${platform}.amountCents`);

  if (!input.providerProductId) {
    throw new Error(
      `[credits] providerProductId is required for package ${packageId} on ${platform}.`,
    );
  }

  return {
    provider: input.provider,
    providerProductId: input.providerProductId,
    currency: input.currency,
    amountCents: input.amountCents,
    status: input.status ?? "active",
  };
}

/** Validates and normalizes the credit configuration used by clients and server code. */
export function normalizeCreditsConfig(
  input: CreditsConfig,
  providerPriceEnvironment: ProviderPriceEnvironment = resolveProviderPriceEnvironment(),
): NormalizedCreditsConfig {
  // Keep configured package and provider IDs unique so webhook lookups are deterministic.
  const packageIds = new Set<string>();
  const webProviderPriceIds = new Set<string>();
  const nativeProviderProductIds = new Set<string>();
  const packages = (input.packages ?? []).map((item) => {
    if (!item.id) {
      throw new Error("[credits] Package id is required.");
    }
    if (packageIds.has(item.id)) {
      throw new Error(`[credits] Duplicate package id: ${item.id}`);
    }
    packageIds.add(item.id);
    assertPositiveInteger(item.amount, `package ${item.id}.amount`);
    assertStatus(item.status, `package ${item.id}`);

    const web = normalizeWebPackage(item.web, item.id, providerPriceEnvironment);
    if (web) {
      const key = `${web.provider}:${web.providerPriceId}`;
      if (webProviderPriceIds.has(key)) {
        throw new Error(`[credits] Duplicate web provider price id: ${key}`);
      }
      webProviderPriceIds.add(key);
    }

    const native: Partial<Record<NativeCreditPlatform, NormalizedCreditNativePackage>> = {};
    for (const platform of ["ios", "android"] as const) {
      const product = normalizeNativePackage(item.native?.[platform], item.id, platform);
      if (!product) {
        continue;
      }
      const key = `${platform}:${product.provider}:${product.providerProductId}`;
      if (nativeProviderProductIds.has(key)) {
        throw new Error(`[credits] Duplicate native provider product id: ${key}`);
      }
      nativeProviderProductIds.add(key);
      native[platform] = product;
    }

    return {
      id: item.id,
      amount: item.amount,
      status: item.status ?? "active",
      web,
      native,
    } satisfies NormalizedCreditPackage;
  });

  return {
    enabled: input.enabled ?? false,
    packages,
    signupGrant: normalizeGrant(input.signupGrant, "signupGrant"),
  };
}

const resolvedCreditsConfig = mergeCreditsConfigs([
  resolveWebCommonConfig().credits,
  resolveNativeCommonConfig().credits,
]);

/** Runtime credit configuration resolved from common app-config. */
export const creditsConfig: CreditsConfig = {
  enabled: resolvedCreditsConfig.enabled,
  packages: resolvedCreditsConfig.packages,
  signupGrant: resolvedCreditsConfig.signupGrant,
};

/** Convenience flag for call sites that only need to know whether credits are enabled. */
export const isCreditsEnabled = creditsConfig.enabled ?? false;

/** Returns normalized credit packages from either supplied config or the runtime config. */
export function listNormalizedCreditPackages(input: CreditsConfig = creditsConfig) {
  return normalizeCreditsConfig(input).packages;
}

/** Finds a configured credit package by its internal package id. */
export function findCreditPackageById(input: CreditsConfig, packageId: string) {
  return listNormalizedCreditPackages(input).find((item) => item.id === packageId) ?? null;
}

/** Finds a credit package by the provider price id received from a web payment provider. */
export function findWebCreditPackageByProviderPriceId(
  input: CreditsConfig,
  providerPriceId: string,
): NormalizedWebCreditPackageMatch | null {
  for (const creditPackage of listNormalizedCreditPackages(input)) {
    if (creditPackage.web?.providerPriceId === providerPriceId) {
      return {
        package: creditPackage,
        price: creditPackage.web,
      };
    }
  }

  return null;
}

/** Finds a credit package by the provider product id received from a native payment provider. */
export function findNativeCreditPackageByProviderProductId(
  input: CreditsConfig,
  providerProductId: string,
): NormalizedNativeCreditPackageMatch | null {
  for (const creditPackage of listNormalizedCreditPackages(input)) {
    for (const platform of ["ios", "android"] as const) {
      const product = creditPackage.native[platform];
      if (product?.providerProductId === providerProductId) {
        return {
          platform,
          package: creditPackage,
          product,
        };
      }
    }
  }

  return null;
}
