import type { CreditOrder } from "../../db/schema/credits";
import { creditsConfig, findCreditPackageById } from "@repo/app-config/credits";
import { and, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { creditOrder } from "@/db/schema/credits";
import { findBillingCustomer } from "@/payments/infrastructure/repositories/billing-store";
import type { CheckoutSessionResult } from "@/payments/public/types";
import {
  claimPaymentOperation,
  completePaymentOperation,
  createPaymentOperationRequest,
  failPaymentOperation,
  getOrCreatePaymentOperation,
  readCheckoutOperationResult,
  savePaymentOperationProviderResult,
} from "@/payments/application/payment-operation";
import { assertCreditAccountNotOnBillingHold, assertCreditsEnabled } from "./internal";
import { grantCredits } from "./grant";
import type {
  CompleteCreditOrderPurchaseInput,
  CreateCreditCheckoutSessionInput,
  MarkCreditOrderRefundedInput,
  MarkCreditOrderStatusInput,
} from "./types";

type PublicCreditOrderInput = Pick<
  CreditOrder,
  | "id"
  | "packageId"
  | "provider"
  | "status"
  | "creditAmount"
  | "amountCents"
  | "currency"
  | "ledgerTransactionId"
  | "createdAt"
  | "updatedAt"
>;

export function toPublicCreditOrder(order: PublicCreditOrderInput) {
  return {
    id: order.id,
    packageId: order.packageId,
    provider: order.provider,
    status: order.status,
    creditAmount: order.creditAmount,
    amountCents: order.amountCents,
    currency: order.currency,
    credited: order.status === "completed" && order.ledgerTransactionId !== null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function createCreditCheckoutSession(
  db: Database,
  input: CreateCreditCheckoutSessionInput,
): Promise<CheckoutSessionResult & { creditOrderId: string }> {
  assertCreditsEnabled();
  await assertCreditAccountNotOnBillingHold(db, input.user.userId);
  const now = new Date();
  const creditPackage = findCreditPackageById(creditsConfig, input.packageId);
  if (!creditPackage || creditPackage.status !== "active" || !creditPackage.web) {
    throw new Error("Credit package not available");
  }
  if (creditPackage.web.status !== "active") {
    throw new Error("Credit package not available");
  }
  if (input.provider && input.provider !== creditPackage.web.provider) {
    throw new Error("Credit package provider mismatch");
  }

  const existingCustomer = await findBillingCustomer(db, {
    userId: input.user.userId,
    provider: creditPackage.web.provider,
  });
  const { getPaymentProvider } = await import("@/payments/providers");
  const provider = getPaymentProvider(creditPackage.web.provider);
  const requestedOrderId = crypto.randomUUID();
  const operationId = input.operationId ?? crypto.randomUUID();
  const operationRequest = await createPaymentOperationRequest({
    provider: creditPackage.web.provider,
    mode: "payment",
    packageId: creditPackage.id,
    providerPriceId: creditPackage.web.providerPriceId,
    creditAmount: creditPackage.amount,
    amountCents: creditPackage.web.amountCents,
    currency: creditPackage.web.currency,
    returnUrl: new URL(input.returnUrl).toString(),
  });
  const operation = await getOrCreatePaymentOperation(db, {
    userId: input.user.userId,
    provider: creditPackage.web.provider,
    operationType: "credit_checkout",
    operationId,
    ...operationRequest,
    idempotencyMode:
      provider.capabilities.checkoutIdempotency === "native" ? "native" : "local_only",
    relatedResourceType: "credit_order",
    relatedResourceId: requestedOrderId,
  });
  const orderId = operation.relatedResourceId ?? requestedOrderId;
  await db
    .insert(creditOrder)
    .values({
      id: orderId,
      userId: input.user.userId,
      packageId: creditPackage.id,
      provider: creditPackage.web.provider,
      providerSessionId: null,
      providerPaymentId: null,
      status: "pending",
      creditAmount: creditPackage.amount,
      amountCents: creditPackage.web.amountCents,
      currency: creditPackage.web.currency,
      ledgerTransactionId: null,
      expiresAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
  if (operation.status === "completed" || operation.status === "provider_succeeded") {
    const stored = readCheckoutOperationResult(operation);
    if (operation.status === "provider_succeeded") {
      await finalizeCreditOrderCheckout(db, orderId, stored, new Date());
      await completePaymentOperation(db, operation.id);
    }
    return {
      providerSessionId: stored.providerSessionId,
      url: stored.url,
      expiresAt: stored.expiresAt ? new Date(stored.expiresAt) : null,
      creditOrderId: orderId,
    };
  }
  const claim = await claimPaymentOperation(db, operation, now);
  if (!claim) throw new Error("PAYMENT_OPERATION_IN_PROGRESS");

  let providerSucceeded = false;
  try {
    const session = await provider.createCheckoutSession({
      mode: "payment",
      lineItems: [{ priceId: creditPackage.web.providerPriceId, quantity: 1 }],
      currency: creditPackage.web.currency,
      successUrl: input.returnUrl,
      cancelUrl: input.returnUrl,
      metadata: {
        kind: "credit_purchase",
        userId: input.user.userId,
        creditPackageId: creditPackage.id,
        paymentOperationId: operation.id,
        creditOrderId: orderId,
        provider: creditPackage.web.provider,
      },
      idempotencyKey: claim.operation.operationKey,
      ...(existingCustomer?.providerCustomerId
        ? { customerId: existingCustomer.providerCustomerId }
        : {}),
      ...((existingCustomer?.email ?? input.customerEmail)
        ? { customerEmail: existingCustomer?.email ?? input.customerEmail! }
        : {}),
    });

    const stored = {
      providerSessionId: session.providerSessionId,
      url: session.url,
      expiresAt: session.expiresAt?.toISOString() ?? null,
    };
    await savePaymentOperationProviderResult(db, operation.id, claim.token, stored, new Date());
    providerSucceeded = true;
    await finalizeCreditOrderCheckout(db, orderId, stored, new Date());
    await completePaymentOperation(db, operation.id, new Date());

    return { ...session, creditOrderId: orderId };
  } catch (error) {
    const failure = await failPaymentOperation(
      db,
      operation.id,
      claim.token,
      error,
      operation.idempotencyMode === "local_only",
    );
    if (!providerSucceeded && failure?.status === "failed" && !failure.retryable) {
      await db
        .update(creditOrder)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(creditOrder.id, orderId));
    }
    throw error;
  }
}

async function finalizeCreditOrderCheckout(
  db: Database,
  orderId: string,
  result: { providerSessionId: string; expiresAt: string | null },
  now: Date,
) {
  await db
    .update(creditOrder)
    .set({
      providerSessionId: result.providerSessionId,
      expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
      updatedAt: now,
    })
    .where(eq(creditOrder.id, orderId));
}

export async function completeCreditOrderPurchase(
  db: Database,
  input: CompleteCreditOrderPurchaseInput,
) {
  assertCreditsEnabled();

  const [order] = await db
    .select()
    .from(creditOrder)
    .where(eq(creditOrder.id, input.orderId))
    .limit(1);

  if (!order) {
    throw new Error("Credit order not found");
  }
  if (order.provider !== input.sourceProvider) {
    throw new Error("Credit order provider does not match the payment event");
  }
  if (order.providerSessionId && input.providerSessionId !== order.providerSessionId) {
    throw new Error("Credit order session does not match the payment event");
  }
  if (order.providerPaymentId && input.providerPaymentId !== order.providerPaymentId) {
    throw new Error("Credit order payment does not match the payment event");
  }
  if (
    input.providerAmountCents !== null &&
    input.providerAmountCents !== undefined &&
    input.providerAmountCents !== order.amountCents
  ) {
    throw new Error("Credit order amount does not match the payment event");
  }
  if (
    input.providerCurrency !== null &&
    input.providerCurrency !== undefined &&
    input.providerCurrency.toLowerCase() !== order.currency.toLowerCase()
  ) {
    throw new Error("Credit order currency does not match the payment event");
  }
  if ((order.status === "completed" && order.ledgerTransactionId) || order.status === "refunded") {
    return order;
  }
  if (order.status !== "pending") {
    throw new Error("Credit order cannot be completed from its current state");
  }

  const transaction = await grantCredits(db, {
    user: { userId: order.userId },
    amount: order.creditAmount,
    sourceProvider: input.sourceProvider,
    sourceType: "purchase",
    sourceId: input.sourceId,
    packageId: order.packageId,
    metadata: { ...input.metadata, creditOrderId: order.id },
  });

  const now = new Date();
  await db
    .update(creditOrder)
    .set({
      status: "completed",
      providerSessionId: input.providerSessionId ?? order.providerSessionId,
      providerPaymentId: input.providerPaymentId ?? input.sourceId,
      ledgerTransactionId: transaction?.id ?? order.ledgerTransactionId,
      updatedAt: now,
    })
    .where(eq(creditOrder.id, order.id));

  const [updated] = await db
    .select()
    .from(creditOrder)
    .where(eq(creditOrder.id, order.id))
    .limit(1);
  return updated ?? order;
}

export async function markCreditOrderStatus(db: Database, input: MarkCreditOrderStatusInput) {
  assertCreditsEnabled();
  await db
    .update(creditOrder)
    .set({
      status: input.status,
      providerPaymentId: input.providerPaymentId ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(creditOrder.id, input.orderId), eq(creditOrder.status, "pending")));
}

export async function markCreditOrderRefunded(db: Database, input: MarkCreditOrderRefundedInput) {
  assertCreditsEnabled();
  const updated = await db
    .update(creditOrder)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(
      and(
        eq(creditOrder.provider, input.sourceProvider),
        eq(creditOrder.providerPaymentId, input.providerPaymentId),
      ),
    )
    .returning({ id: creditOrder.id });

  return updated.length > 0;
}
