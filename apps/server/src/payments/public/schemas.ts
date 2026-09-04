import {
  BILLING_INTERVALS,
  PRICE_TYPES,
  SUBSCRIPTION_STATUSES,
} from "@repo/app-config/payments/web";
import {
  PERSISTED_SERVER_PAYMENT_PROVIDERS,
  SUPPORTED_SERVER_PAYMENT_PROVIDERS,
} from "@repo/app-config";
import { z } from "zod";

/**
 * Supported provider enum schema.
 */
export const providerEnum = z.enum(SUPPORTED_SERVER_PAYMENT_PROVIDERS);
const persistedProviderEnum = z.enum(PERSISTED_SERVER_PAYMENT_PROVIDERS);

/**
 * Price type enum schema.
 */
const priceTypeEnum = z.enum(PRICE_TYPES);

/**
 * Billing interval enum schema.
 */
const intervalEnum = z.enum(BILLING_INTERVALS);

/**
 * Subscription status enum schema.
 */
const subscriptionStatusEnum = z.enum(SUBSCRIPTION_STATUSES);

/**
 * Purchase status enum schema.
 */
const purchaseStatusEnum = z.enum(["succeeded", "pending", "failed", "refunded"]);

/**
 * Membership tier enum schema.
 */
const membershipTierEnum = z.enum(["free", "monthly", "yearly", "lifetime"]);

/**
 * Entitlement source enum schema.
 */
const entitlementSourceEnum = z.enum(["none", "subscription", "lifetime"]);

/**
 * Schema that validates one price item in a plan.
 */
export const priceSchema = z.object({
  id: z.string(),
  planId: z.string(),
  provider: providerEnum,
  providerPriceId: z.string(),
  currency: z.string(),
  amountCents: z.number(),
  priceType: priceTypeEnum,
  interval: intervalEnum.nullable(),
  trialDays: z.number().int().positive().nullable(),
  status: z.enum(["active", "archived"]),
});

export const planSchema = z.object({
  id: z.string(),
  status: z.enum(["active", "archived"]),
  prices: z.array(priceSchema),
});

/**
 * Schema that validates full billing status payload returned by API.
 */
export const billingStatusSchema = z.object({
  userId: z.string(),
  billingProvider: persistedProviderEnum.nullable(),
  canManageBilling: z.boolean(),
  activePlan: z
    .object({
      id: z.string(),
    })
    .nullable(),
  activePrice: z
    .object({
      id: z.string(),
      currency: z.string(),
      amountCents: z.number(),
      priceType: priceTypeEnum,
      interval: intervalEnum.nullable(),
    })
    .nullable(),
  currentEntitlement: z.object({
    tier: membershipTierEnum,
    source: entitlementSourceEnum,
  }),
  hasActiveSubscription: z.boolean(),
  subscription: z
    .object({
      id: z.string(),
      userId: z.string(),
      provider: persistedProviderEnum,
      providerSubscriptionId: z.string(),
      providerCustomerId: z.string(),
      planId: z.string(),
      priceId: z.string(),
      status: subscriptionStatusEnum,
      currentPeriodEnd: z.date().nullable(),
      cancelAtPeriodEnd: z.boolean(),
      startedAt: z.date().nullable(),
      endedAt: z.date().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .nullable(),
  lifetimePurchase: z
    .object({
      id: z.string(),
      userId: z.string(),
      provider: persistedProviderEnum,
      providerPaymentIntentId: z.string(),
      planId: z.string(),
      priceId: z.string(),
      status: purchaseStatusEnum,
      paidAt: z.date().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .nullable(),
});

/** A safe, user-facing payment history row. Provider resource IDs stay server-side. */
export const purchaseHistoryItemSchema = z.object({
  type: z.enum(["subscription", "membership", "credits"]),
  label: z.string(),
  provider: persistedProviderEnum,
  status: z.string(),
  amountCents: z.number().int().nullable(),
  currency: z.string().nullable(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
});

export const purchaseHistoryCursorSchema = z.object({
  createdAt: z.date(),
  type: purchaseHistoryItemSchema.shape.type,
  id: z.string(),
});

export const purchaseHistorySchema = z.object({
  items: z.array(purchaseHistoryItemSchema),
  nextCursor: purchaseHistoryCursorSchema.nullable(),
});

export type PurchaseHistoryItem = z.infer<typeof purchaseHistoryItemSchema>;

/**
 * Billing status TypeScript type inferred from schema.
 */
export type BillingStatus = z.infer<typeof billingStatusSchema>;
