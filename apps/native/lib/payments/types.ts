import { type NormalizedNativePlan } from "@repo/app-config/payments/native";
import type { NativePaymentProviderKey } from "@repo/app-config";
import type { CurrentEntitlement } from "@repo/app-config/membership";

import { type PlatformOSType } from "react-native";

import {
  type CustomerInfo,
  type MakePurchaseResult,
  type PurchasesOfferings,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from "react-native-purchases";

/** Describes whether native payments can be used in the current runtime. */
export type NativePaymentsAvailability = "available" | "disabled" | "unavailable";

/** Runtime configuration resolved for the current native platform. */
export type NativePaymentsConfig = {
  availability: NativePaymentsAvailability;
  apiKey: string | undefined;
  entitlementId: string | undefined;
  error: Error | null;
  isAvailable: boolean;
  isEnabled: boolean;
  platform: PlatformOSType;
  plans: NormalizedNativePlan[];
  provider: NativePaymentProviderKey;
};

/** Lightweight active plan payload derived from the native catalog. */
export type NativeActivePlan = {
  id: string;
};

/** Lightweight active price payload derived from the native catalog. */
export type NativeActivePrice = Pick<
  NormalizedNativePlan["prices"][number],
  "id" | "currency" | "amountCents" | "priceType" | "interval"
>;

/** Normalized entitlement state exposed to native app code. */
export type NativeEntitlementState = {
  currentEntitlement: CurrentEntitlement;
  activePlan: NativeActivePlan | null;
  activePrice: NativeActivePrice | null;
  hasLifetime: boolean;
  hasActiveSubscription: boolean;
};

/** Snapshot of the most useful RevenueCat state for app code. */
export type NativePaymentsSnapshot = {
  appUserId: string | null;
  customerInfo: CustomerInfo | null;
  isAnonymous: boolean;
  offerings: PurchasesOfferings | null;
};

/** A configured native price that matches an active RevenueCat product. */
export type ActivePlanPriceMatch = {
  planId: string;
  priceId: string;
  productIdentifier: string;
};

/** Input used to purchase a configured native plan price. */
export type PurchasePlanPriceInput = {
  offeringId?: string;
  planId: string;
  priceId: string;
};

/** Purchase result enriched with the matched package chosen by the wrapper. */
export type PurchasePlanPriceResult = MakePurchaseResult & {
  packageToPurchase: PurchasesPackage;
};

/** Input used to purchase a configured native credit package. */
export type PurchaseCreditPackageInput = {
  /** Internal credit package id from app-config. */
  packageId: string;
};

/** Credit package purchase result enriched with the matched store product. */
export type PurchaseCreditPackageResult = MakePurchaseResult & {
  /** Store product selected from the configured credit package. */
  productToPurchase: PurchasesStoreProduct;
};

/** Input for explicit paywall presentation. */
export type PresentPaywallInput = {
  offeringId?: string;
};

/** Input for entitlement-gated paywall presentation. */
export type PresentPaywallIfNeededInput = PresentPaywallInput & {
  entitlementId?: string;
};

/** Options controlling how much data should be loaded from RevenueCat. */
export type LoadPaymentsSnapshotOptions = {
  customerInfo?: CustomerInfo | null;
  includeOfferings?: boolean;
};
