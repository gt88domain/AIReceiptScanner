import type { NativeCreditPlatform } from "@repo/app-config/credits";
import type { ServerPaymentProviderKey, WebPaymentProviderKey } from "@repo/app-config";
import type { CreditSourceProvider, CreditSourceType } from "@/db/schema/credits";
import type { CreditPurchaseRecoveryState, CreditPurchaseRecoveryType } from "@/db/schema/credits";

export type CreditUser = {
  userId: string;
};

export type SignupGrantRequestContext = {
  hashSecret?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type CreditServiceContext = {
  signupGrant?: SignupGrantRequestContext;
};

export type CreditMetadata = Record<string, string | number | boolean | null>;

export type CreditSource = {
  sourceProvider: CreditSourceProvider;
  sourceType: CreditSourceType;
  sourceId: string;
};

export type GrantCreditsInput = CreditSource & {
  user: CreditUser;
  amount: number;
  packageId?: string | null;
  expiresAt?: Date | null;
  metadata?: CreditMetadata | null;
};

export type GrantCreditPackagePurchaseInput = {
  user: CreditUser;
  packageId: string;
  sourceProvider: ServerPaymentProviderKey;
  sourceId: string;
  metadata?: CreditMetadata | null;
};

export type RecordNativeCreditOrderPurchaseInput = GrantCreditPackagePurchaseInput & {
  platform: NativeCreditPlatform;
};

export type RevokeCreditPurchaseInput = {
  user: CreditUser;
  originalSourceProvider: ServerPaymentProviderKey;
  originalSourceId: string;
  refundSourceId: string;
  recoverySourceType?: "refund" | "chargeback";
  amount?: number;
  metadata?: CreditMetadata | null;
};

export type RevokeCreditPurchaseBySourceInput = {
  originalSourceProvider: ServerPaymentProviderKey;
  originalSourceId: string;
  refundSourceId: string;
  recoverySourceType?: "refund" | "chargeback";
  amount?: number;
  metadata?: CreditMetadata | null;
};

export type ConsumeCreditsInput = {
  user: CreditUser;
  amount: number;
  /** Generated from billable_operation.id; never supplied by a client. */
  sourceId: string;
  metadata?: CreditMetadata | null;
};

export type BeginBillableOperationInput = {
  user: CreditUser;
  feature: string;
  operationId: string;
  requestHash: string;
  calculatedCost: number;
};

export type CompleteBillableOperationInput = Pick<
  BeginBillableOperationInput,
  "user" | "feature" | "operationId"
> & {
  resultReference: string;
};

export type FailBillableOperationInput = Pick<
  BeginBillableOperationInput,
  "user" | "feature" | "operationId"
> & {
  failureReason: string;
};

export type ListTransactionsInput = {
  user: CreditUser;
  page: number;
  perPage: number;
  sourceType?: CreditSourceType;
};

export type ListCreditOrdersInput = {
  user: CreditUser;
  page: number;
  perPage: number;
};

export type ListPackagesInput = {
  platform: "web" | "ios" | "android";
};

export type CreateCreditCheckoutSessionInput = {
  user: CreditUser;
  packageId: string;
  returnUrl: string;
  provider?: WebPaymentProviderKey;
  customerEmail?: string | null;
  operationId?: string;
};

export type CompleteCreditOrderPurchaseInput = {
  orderId: string;
  sourceProvider: ServerPaymentProviderKey;
  sourceId: string;
  providerSessionId?: string | null;
  providerPaymentId?: string | null;
  providerAmountCents?: number | null;
  providerCurrency?: string | null;
  metadata?: CreditMetadata | null;
};

export type MarkCreditOrderStatusInput = {
  orderId: string;
  status: "failed" | "expired";
  providerPaymentId?: string | null;
};

export type MarkCreditOrderRefundedInput = {
  sourceProvider: ServerPaymentProviderKey;
  providerPaymentId: string;
};

export type ApplyCreditPurchaseRecoveryInput = {
  provider: ServerPaymentProviderKey;
  providerPaymentId: string;
  recoveryType: CreditPurchaseRecoveryType;
  providerRecoveryId: string;
  state: CreditPurchaseRecoveryState;
  amountCents: number;
  currency: string;
  providerEventAt?: Date | null;
  providerEventId?: string | null;
};
