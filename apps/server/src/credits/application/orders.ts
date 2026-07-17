import type { CreditOrder } from "../../db/schema/credits";
import { creditsConfig, findCreditPackageById } from "@repo/app-config/credits";
import { and, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { creditOrder } from "@/db/schema/credits";
import { findBillingCustomer } from "@/payments/infrastructure/repositories/billing-store";
import type { CheckoutSessionResult } from "@/payments/public/types";
import { assertCreditsEnabled } from "./internal";
import { grantCreditPackagePurchase } from "./grant";
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
  const orderId = crypto.randomUUID();

  await db.insert(creditOrder).values({
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
  });

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
        creditOrderId: orderId,
        provider: creditPackage.web.provider,
      },
      ...(existingCustomer?.providerCustomerId
        ? { customerId: existingCustomer.providerCustomerId }
        : {}),
      ...((existingCustomer?.email ?? input.customerEmail)
        ? { customerEmail: existingCustomer?.email ?? input.customerEmail! }
        : {}),
    });

    await db
      .update(creditOrder)
      .set({
        providerSessionId: session.providerSessionId,
        expiresAt: session.expiresAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(creditOrder.id, orderId));

    return { ...session, creditOrderId: orderId };
  } catch (error) {
    await db
      .update(creditOrder)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(creditOrder.id, orderId));
    throw error;
  }
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
  if ((order.status === "completed" && order.ledgerTransactionId) || order.status === "refunded") {
    return order;
  }

  const transaction = await grantCreditPackagePurchase(db, {
    user: { userId: order.userId },
    packageId: order.packageId,
    sourceProvider: input.sourceProvider,
    sourceId: input.sourceId,
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
