/**
 * Minimal RevenueCat wrapper for the native app.
 * Consumers import the `nativePayments` singleton and call methods directly.
 */
import {
  DEFAULT_NATIVE_PAYMENT_PROVIDER,
  isNativePaymentsEnabled,
  nativePaymentsConfig,
  normalizeNativePaymentsConfig,
  type NormalizedNativePlan,
  type NativePaymentPlatform,
} from "@repo/app-config/payments/native";
import { creditsConfig, findCreditPackageById } from "@repo/app-config/credits";
import { toError } from "@repo/shared";

import { Platform } from "react-native";

import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";

import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import {
  NativePaymentsConfig,
  LoadPaymentsSnapshotOptions,
  NativePaymentsSnapshot,
  ActivePlanPriceMatch,
  PresentPaywallInput,
  PurchasePlanPriceInput,
  PurchasePlanPriceResult,
  PurchaseCreditPackageInput,
  PurchaseCreditPackageResult,
  PresentPaywallIfNeededInput,
} from "./types";

/**
 * Selects the RevenueCat SDK key for the active native platform.
 */
function resolveApiKeyForPlatform() {
  switch (Platform.OS) {
    case "ios":
      return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
    case "android":
      return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Resolves the current native payments platform when supported.
 */
export function resolveNativePaymentsPlatform(): NativePaymentPlatform | null {
  switch (Platform.OS) {
    case "ios":
    case "android":
      return Platform.OS;
    default:
      return null;
  }
}

/**
 * Builds the runtime config used by the wrapper singleton.
 */
function createConfig(): NativePaymentsConfig {
  const nativePlatform = resolveNativePaymentsPlatform();
  const isEnabled = Boolean(isNativePaymentsEnabled);
  let error: Error | null = null;
  let plans: NormalizedNativePlan[] = [];

  if (!isEnabled) {
    return {
      availability: "disabled",
      apiKey: resolveApiKeyForPlatform(),
      entitlementId: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID,
      error: null,
      isAvailable: false,
      isEnabled,
      platform: Platform.OS,
      plans,
      provider: DEFAULT_NATIVE_PAYMENT_PROVIDER,
    };
  }

  if (nativePlatform) {
    try {
      plans = normalizeNativePaymentsConfig(nativePaymentsConfig, nativePlatform);
    } catch (cause) {
      error =
        cause instanceof Error ? cause : new Error("Failed to normalize native payments config");
    }
  }

  const apiKey = resolveApiKeyForPlatform();
  const entitlementId = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID;
  const isSupportedPlatform = nativePlatform !== null;

  if (error || !isSupportedPlatform || !apiKey) {
    return {
      availability: "unavailable",
      apiKey,
      entitlementId,
      error:
        error ??
        (!isSupportedPlatform
          ? new Error(`RevenueCat is not supported on platform "${Platform.OS}"`)
          : new Error("RevenueCat API key is missing for the current platform")),
      isAvailable: false,
      isEnabled,
      platform: Platform.OS,
      plans,
      provider: DEFAULT_NATIVE_PAYMENT_PROVIDER,
    };
  }

  return {
    availability: "available",
    apiKey,
    entitlementId,
    error,
    isAvailable: true,
    isEnabled,
    platform: Platform.OS,
    plans,
    provider: DEFAULT_NATIVE_PAYMENT_PROVIDER,
  };
}

/**
 * Single RevenueCat wrapper used by the native app.
 */
class NativePaymentsSdk {
  private configuredApiKey: string | null = null;

  private readonly config = createConfig();

  /**
   * Returns the resolved runtime config.
   */
  getConfig() {
    return this.config;
  }

  /**
   * Throws when payments are not available for the current runtime.
   */
  private assertAvailable() {
    if (this.config.availability !== "available" || !this.config.apiKey) {
      throw (
        this.config.error ??
        new Error("RevenueCat is not available in the current app configuration")
      );
    }
  }

  /**
   * Configures RevenueCat once per process for the current platform API key.
   */
  configure() {
    this.assertAvailable();
    const apiKey = this.config.apiKey as string;

    if (this.configuredApiKey === apiKey) {
      return true;
    }

    Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.INFO);
    Purchases.setProxyURL("https://api.rc-backup.com/");
    Purchases.configure({
      apiKey,
    });
    this.configuredApiKey = apiKey;
    return true;
  }

  /**
   * Loads customer info, identity, and optionally offerings in one request group.
   */
  async getSnapshot(options: LoadPaymentsSnapshotOptions = {}): Promise<NativePaymentsSnapshot> {
    this.configure();

    const [customerInfo, appUserId, isAnonymous, offerings] = await Promise.all([
      options.customerInfo ? Promise.resolve(options.customerInfo) : Purchases.getCustomerInfo(),
      Purchases.getAppUserID(),
      Purchases.isAnonymous(),
      options.includeOfferings === false ? Promise.resolve(null) : Purchases.getOfferings(),
    ]);

    return {
      appUserId,
      customerInfo,
      isAnonymous,
      offerings,
    };
  }

  /**
   * Returns the latest RevenueCat customer info.
   */
  async getCustomerInfo() {
    this.configure();
    return Purchases.getCustomerInfo();
  }

  /**
   * Returns the latest RevenueCat offerings.
   */
  async getOfferings() {
    this.configure();
    return Purchases.getOfferings();
  }

  /**
   * Returns the current RevenueCat app user ID.
   */
  async getAppUserId() {
    this.configure();
    return Purchases.getAppUserID();
  }

  /**
   * Returns whether RevenueCat is currently using an anonymous identity.
   */
  async isAnonymous() {
    this.configure();
    return Purchases.isAnonymous();
  }

  /**
   * Subscribes to RevenueCat customer info updates and returns an unsubscribe callback.
   */
  addCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener) {
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }

  /**
   * Logs RevenueCat into a known app user ID.
   */
  async logIn(appUserId: string) {
    this.configure();
    return Purchases.logIn(appUserId);
  }

  /**
   * Logs RevenueCat out and returns it to anonymous state.
   */
  async logOut() {
    this.configure();

    // RevenueCat rejects logOut calls when the current identity is already anonymous.
    if (await Purchases.isAnonymous()) {
      return Purchases.getCustomerInfo();
    }

    return Purchases.logOut();
  }

  /**
   * Synchronizes RevenueCat identity with application auth state.
   *
   * Pass a user ID to log in, or `null` to log out back to anonymous.
   */
  async syncAppUser(appUserId: string | null) {
    if (appUserId) {
      await this.logIn(appUserId);
      const currentAppUserId = await this.getAppUserId();
      if (currentAppUserId !== appUserId) {
        throw new Error(
          `RevenueCat identity mismatch: expected "${appUserId}", received "${currentAppUserId ?? "anonymous"}"`,
        );
      }
      return;
    }

    await this.logOut();
    if (!(await this.isAnonymous())) {
      throw new Error("RevenueCat identity mismatch: expected an anonymous user after logout");
    }
  }

  /**
   * Returns all active entitlement identifiers from RevenueCat customer info.
   */
  getActiveEntitlementIds(customerInfo: CustomerInfo | null) {
    if (!customerInfo) {
      return [];
    }

    return Object.keys(customerInfo.entitlements.active);
  }

  /**
   * Checks whether a specific entitlement is active, or whether any entitlement is active when omitted.
   */
  isEntitlementActive(customerInfo: CustomerInfo | null, entitlementId?: string | null) {
    if (!customerInfo) {
      return false;
    }

    if (entitlementId) {
      return Boolean(customerInfo.entitlements.active[entitlementId]);
    }

    return this.getActiveEntitlementIds(customerInfo).length > 0;
  }

  /**
   * Returns the current offering from a RevenueCat offerings payload.
   */
  getCurrentOffering(offerings: PurchasesOfferings | null) {
    return offerings?.current ?? null;
  }

  /**
   * Returns an offering by identifier, or falls back to the current offering when omitted.
   */
  getOfferingById(offerings: PurchasesOfferings | null, offeringId?: string) {
    if (!offerings) {
      return null;
    }

    if (!offeringId) {
      return this.getCurrentOffering(offerings);
    }

    return offerings.all[offeringId] ?? null;
  }

  /**
   * Resolves a configured native price from the runtime config.
   */
  private getConfiguredPrice(planId: string, priceId: string) {
    const plan = this.config.plans.find((item) => item.id === planId);
    return plan?.prices.find((item) => item.id === priceId) ?? null;
  }

  /**
   * Resolves a configured native credit product for the current platform.
   */
  private getConfiguredCreditProduct(packageId: string) {
    const nativePlatform = resolveNativePaymentsPlatform();
    if (!nativePlatform) {
      throw new Error(`Native credit packages are not supported on platform "${Platform.OS}"`);
    }

    const creditPackage = findCreditPackageById(creditsConfig, packageId);
    const product = creditPackage?.native[nativePlatform];

    if (
      !creditPackage ||
      creditPackage.status !== "active" ||
      !product ||
      product.status !== "active"
    ) {
      throw new Error(
        `Native credit package "${packageId}" is not configured for platform "${nativePlatform}"`,
      );
    }

    return product;
  }

  /**
   * Resolves a RevenueCat package by product identifier from fetched offerings.
   */
  private getPackageByProductIdentifier(input: {
    offeringId?: string;
    offerings: PurchasesOfferings | null;
    productIdentifier: string;
  }) {
    if (!input.offerings) {
      return null;
    }

    const offerings = Object.values(input.offerings.all);
    const requestedOffering = input.offeringId
      ? this.getOfferingById(input.offerings, input.offeringId)
      : null;
    const offeringsToSearch = requestedOffering
      ? [
          requestedOffering,
          ...offerings.filter((offering) => offering.identifier !== requestedOffering.identifier),
        ]
      : offerings;

    for (const offering of offeringsToSearch) {
      const matchingPackage = offering.availablePackages.find(
        (aPackage) => aPackage.product.identifier === input.productIdentifier,
      );

      if (matchingPackage) {
        return matchingPackage;
      }
    }

    return null;
  }

  private getOfferingProductIdentifiers(offerings: PurchasesOfferings | null) {
    if (!offerings) {
      return [];
    }

    return Object.values(offerings.all).flatMap((offering) =>
      offering.availablePackages.map(
        (aPackage) => `${offering.identifier}:${aPackage.product.identifier}`,
      ),
    );
  }

  /**
   * Resolves a RevenueCat package by joining configured native plan data with fetched offerings.
   */
  getPackageByPlanPrice(input: {
    offeringId?: string;
    offerings: PurchasesOfferings | null;
    planId: string;
    priceId: string;
  }) {
    const price = this.getConfiguredPrice(input.planId, input.priceId);

    if (!price || !input.offerings) {
      return null;
    }

    return this.getPackageByProductIdentifier({
      offeringId: input.offeringId,
      offerings: input.offerings,
      productIdentifier: price.providerPriceId,
    });
  }

  /**
   * Maps active RevenueCat products back to configured `{ planId, priceId }` pairs.
   */
  getActivePlanPriceIds(customerInfo: CustomerInfo | null): ActivePlanPriceMatch[] {
    if (!customerInfo) {
      return [];
    }

    const activeProductIds = new Set<string>(customerInfo.activeSubscriptions);

    for (const entitlement of Object.values(customerInfo.entitlements.active)) {
      activeProductIds.add(entitlement.productIdentifier);
    }

    const matches: ActivePlanPriceMatch[] = [];
    const seen = new Set<string>();

    for (const plan of this.config.plans) {
      for (const price of plan.prices) {
        if (!activeProductIds.has(price.providerPriceId)) {
          continue;
        }

        const key = `${plan.id}:${price.id}`;

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        matches.push({
          planId: plan.id,
          priceId: price.id,
          productIdentifier: price.providerPriceId,
        });
      }
    }

    return matches;
  }

  /**
   * Purchases a specific RevenueCat package directly.
   */
  async purchasePackage(aPackage: PurchasesPackage) {
    this.configure();
    return Purchases.purchasePackage(aPackage);
  }

  /**
   * Purchases a configured native plan price without requiring callers to handle raw SDK package lookup.
   */
  async purchasePlanPrice(input: PurchasePlanPriceInput): Promise<PurchasePlanPriceResult> {
    this.configure();
    const price = this.getConfiguredPrice(input.planId, input.priceId);

    if (!price) {
      throw new Error(
        `Native price "${input.planId}:${input.priceId}" is not configured for platform "${this.config.platform}"`,
      );
    }

    const offerings = await this.getOfferings();
    const packageToPurchase = this.getPackageByPlanPrice({
      offeringId: input.offeringId,
      offerings,
      planId: input.planId,
      priceId: input.priceId,
    });

    if (!packageToPurchase) {
      const availableProducts = this.getOfferingProductIdentifiers(offerings).join(", ");
      throw new Error(
        `RevenueCat package not found for configured native price "${input.planId}:${input.priceId}" (${price.providerPriceId}). Available products: ${availableProducts || "none"}`,
      );
    }

    const result = await Purchases.purchasePackage(packageToPurchase);

    return {
      ...result,
      packageToPurchase,
    };
  }

  /**
   * Purchases a configured native credit package without granting credits locally.
   * The backend RevenueCat webhook is the only source allowed to add account credits.
   */
  async purchaseCreditPackage(
    input: PurchaseCreditPackageInput,
  ): Promise<PurchaseCreditPackageResult> {
    this.configure();
    const product = this.getConfiguredCreditProduct(input.packageId);
    const products = await Purchases.getProducts(
      [product.providerProductId],
      Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    );
    const productToPurchase =
      products.find((item) => item.identifier === product.providerProductId) ?? null;

    if (!productToPurchase) {
      const availableProducts = products.map((item) => item.identifier).join(", ");
      throw new Error(
        `RevenueCat store product not found for configured native credit package "${input.packageId}" (${product.providerProductId}). Available products: ${availableProducts || "none"}`,
      );
    }

    try {
      const result = await Purchases.purchaseStoreProduct(productToPurchase);

      return {
        ...result,
        productToPurchase,
      };
    } catch (cause) {
      console.warn("[native payments] Failed to purchase credit package", {
        packageId: input.packageId,
        productIdentifier: product.providerProductId,
        cause,
      });
      throw cause;
    }
  }

  /**
   * Restores purchases for the current store account.
   */
  async restorePurchases() {
    this.configure();
    return Purchases.restorePurchases();
  }

  /**
   * Resolves an optional offering identifier into a concrete offering object for paywall presentation.
   */
  private async resolveOfferingForPaywall(
    existingOfferings: PurchasesOfferings | null,
    offeringId?: string,
  ) {
    if (!offeringId) {
      return undefined;
    }

    const offerings = existingOfferings ?? (await this.getOfferings());
    const offering = this.getOfferingById(offerings, offeringId);

    if (!offering) {
      throw new Error(`RevenueCat offering "${offeringId}" was not found`);
    }

    return offering;
  }

  /**
   * Presents a RevenueCat paywall immediately.
   */
  async presentPaywall(
    input: PresentPaywallInput = {},
    offerings: PurchasesOfferings | null = null,
  ) {
    this.configure();
    const offering = await this.resolveOfferingForPaywall(offerings, input.offeringId);

    return RevenueCatUI.presentPaywall(
      offering
        ? {
            offering,
          }
        : undefined,
    );
  }

  /**
   * Presents a RevenueCat paywall only when the required entitlement is not active.
   */
  async presentPaywallIfNeeded(
    input: PresentPaywallIfNeededInput = {},
    offerings: PurchasesOfferings | null = null,
  ) {
    this.configure();

    const requiredEntitlementIdentifier = input.entitlementId ?? this.config.entitlementId;

    if (!requiredEntitlementIdentifier) {
      throw new Error(
        "RevenueCat entitlement identifier is required. Set EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID or pass entitlementId explicitly.",
      );
    }

    const offering = await this.resolveOfferingForPaywall(offerings, input.offeringId);

    return RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier,
      ...(offering
        ? {
            offering,
          }
        : {}),
    });
  }

  /**
   * Indicates whether a paywall result should trigger a follow-up refresh by caller code.
   */
  shouldRefreshAfterPaywall(result: PAYWALL_RESULT) {
    return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
  }

  /**
   * Normalizes unknown values to `Error` so callers can surface consistent failures.
   */
  toError(cause: unknown) {
    return toError(cause, "Unknown native payments error");
  }
}

/** Singleton wrapper used by the native app. */
export const nativePayments = new NativePaymentsSdk();
