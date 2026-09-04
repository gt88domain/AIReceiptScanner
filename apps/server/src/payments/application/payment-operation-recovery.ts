import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import type { Database } from "@/db";
import {
  billingCheckoutSession,
  billingSubscription,
  paymentOperation,
} from "@/db/schema/payments";
import {
  completePaymentOperation,
  claimPaymentOperation,
  failPaymentOperation,
  markPaymentOperationManualReview,
  readCheckoutOperationResult,
  readPaymentOperationRequest,
  savePaymentOperationProviderResult,
  savePaymentOperationProviderSuccess,
} from "./payment-operation";
import { getPaymentProvider } from "../providers";

const PAYMENT_OPERATION_BATCH_SIZE = 25;

/** Finalizes durable provider successes without issuing another provider request. */
export async function reconcilePaymentOperations(db: Database, now = new Date()) {
  const operations = await db
    .select()
    .from(paymentOperation)
    .where(
      or(
        eq(paymentOperation.status, "provider_succeeded"),
        and(
          or(
            eq(paymentOperation.status, "pending"),
            and(eq(paymentOperation.status, "failed"), eq(paymentOperation.retryable, true)),
          ),
          or(isNull(paymentOperation.nextRetryAt), lte(paymentOperation.nextRetryAt, now)),
        ),
        and(
          eq(paymentOperation.status, "processing"),
          or(isNull(paymentOperation.leaseUntil), lte(paymentOperation.leaseUntil, now)),
        ),
      ),
    )
    .orderBy(asc(paymentOperation.updatedAt))
    .limit(PAYMENT_OPERATION_BATCH_SIZE);
  let reconciled = 0;
  for (const operation of operations) {
    if (operation.status === "processing") {
      if (operation.idempotencyMode === "local_only") {
        await markPaymentOperationManualReview(
          db,
          operation.id,
          "PAYMENT_OPERATION_PROVIDER_AMBIGUOUS",
          now,
        );
      } else if (operation.attemptCount < 4) {
        const claim = await claimPaymentOperation(db, operation, now);
        if (claim) {
          try {
            await executeClaimedOperation(db, claim.operation, claim.token, now);
            reconciled += 1;
          } catch (error) {
            await failPaymentOperation(db, claim.operation.id, claim.token, error, false, now);
          }
        }
      }
      continue;
    }
    if (operation.status === "pending" || operation.status === "failed") {
      if (operation.attemptCount >= 4) continue;
      const claim = await claimPaymentOperation(db, operation, now);
      if (!claim) continue;
      try {
        await executeClaimedOperation(db, claim.operation, claim.token, now);
        reconciled += 1;
      } catch (error) {
        await failPaymentOperation(
          db,
          claim.operation.id,
          claim.token,
          error,
          claim.operation.idempotencyMode === "local_only",
          now,
        );
      }
      continue;
    }
    try {
      await finalizeProviderSuccess(db, operation, now);
      await completePaymentOperation(db, operation.id, now);
      reconciled += 1;
    } catch {
      await markPaymentOperationManualReview(
        db,
        operation.id,
        "PAYMENT_OPERATION_LOCAL_FINALIZATION_FAILED",
        now,
      );
    }
  }
  return reconciled;
}

async function executeClaimedOperation(
  db: Database,
  operation: typeof paymentOperation.$inferSelect,
  token: string,
  now: Date,
) {
  const request = readPaymentOperationRequest(operation);
  const provider = getPaymentProvider(operation.provider);
  if (operation.operationType === "subscription_upgrade") {
    await provider.updateSubscriptionPlan({
      subscriptionId: stringField(request, "subscriptionId"),
      currentPriceId: stringField(request, "expectedCurrentProviderPriceId"),
      targetPriceId: stringField(request, "targetPriceId"),
      idempotencyKey: operation.operationKey,
    });
    const updated = await savePaymentOperationProviderSuccess(
      db,
      operation.id,
      token,
      stringField(request, "subscriptionId"),
      JSON.stringify({ version: 1, targetPriceId: stringField(request, "targetPriceId") }),
      now,
    );
    await finalizeProviderSuccess(db, updated, now);
    await completePaymentOperation(db, operation.id, now);
    return;
  }
  const metadata: Record<string, string> = {
    paymentOperationId: operation.id,
    userId: operation.userId,
    provider: operation.provider,
  };
  if (operation.operationType === "credit_checkout") {
    if (!operation.relatedResourceId) throw new Error("Credit checkout order missing");
    metadata.kind = "credit_purchase";
    metadata.creditPackageId = stringField(request, "packageId");
    metadata.creditOrderId = operation.relatedResourceId;
  } else {
    metadata.checkoutSessionId = operation.id;
    metadata.planId = stringField(request, "planId");
    metadata.priceId = stringField(request, "priceId");
  }
  const result = await provider.createCheckoutSession({
    mode: stringField(request, "mode") === "subscription" ? "subscription" : "payment",
    lineItems: [{ priceId: stringField(request, "providerPriceId"), quantity: 1 }],
    currency: stringField(request, "currency"),
    successUrl: stringField(request, "successUrl", false) ?? stringField(request, "returnUrl"),
    cancelUrl: stringField(request, "cancelUrl", false) ?? stringField(request, "returnUrl"),
    metadata,
    idempotencyKey: operation.operationKey,
  });
  const updated = await savePaymentOperationProviderResult(
    db,
    operation.id,
    token,
    {
      providerSessionId: result.providerSessionId,
      url: result.url,
      expiresAt: result.expiresAt?.toISOString() ?? null,
    },
    now,
  );
  await finalizeProviderSuccess(db, updated, now);
  await completePaymentOperation(db, operation.id, now);
}

async function finalizeProviderSuccess(
  db: Database,
  operation: typeof paymentOperation.$inferSelect,
  now: Date,
) {
  const request = readPaymentOperationRequest(operation);
  switch (operation.operationType) {
    case "checkout": {
      const result = readCheckoutOperationResult(operation);
      const planId = stringField(request, "planId");
      const priceId = stringField(request, "priceId");
      const mode = stringField(request, "mode");
      await db
        .insert(billingCheckoutSession)
        .values({
          id: operation.id,
          userId: operation.userId,
          provider: operation.provider,
          providerSessionId: result.providerSessionId,
          planId,
          priceId,
          mode: mode === "subscription" ? "subscription" : "payment",
          status: "created",
          expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      return;
    }
    case "credit_checkout": {
      const result = readCheckoutOperationResult(operation);
      if (!operation.relatedResourceId) throw new Error("Credit checkout order missing");
      const { creditOrder } = await import("@/db/schema/credits");
      await db
        .update(creditOrder)
        .set({
          providerSessionId: result.providerSessionId,
          expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
          updatedAt: now,
        })
        .where(eq(creditOrder.id, operation.relatedResourceId));
      return;
    }
    case "subscription_upgrade": {
      if (!operation.relatedResourceId) throw new Error("Subscription upgrade target missing");
      const expectedCurrentPriceId = stringField(request, "expectedCurrentPriceId");
      const targetPriceId = stringField(request, "targetPriceId");
      const [subscription] = await db
        .select()
        .from(billingSubscription)
        .where(eq(billingSubscription.id, operation.relatedResourceId))
        .limit(1);
      if (!subscription) throw new Error("Subscription not found");
      if (subscription.priceId === targetPriceId) return;
      if (subscription.priceId !== expectedCurrentPriceId)
        throw new Error("SUBSCRIPTION_LOCAL_STATE_DIVERGED");
      const planId = stringField(request, "targetPlanId", false) ?? subscription.planId;
      await db
        .update(billingSubscription)
        .set({ planId, priceId: targetPriceId, cancelAtPeriodEnd: false, updatedAt: now })
        .where(eq(billingSubscription.id, subscription.id));
      return;
    }
  }
}

function stringField(payload: Record<string, unknown>, field: string): string;
function stringField(
  payload: Record<string, unknown>,
  field: string,
  required: false,
): string | null;
function stringField(
  payload: Record<string, unknown>,
  field: string,
  required = true,
): string | null {
  const value = payload[field];
  if (typeof value === "string" && value) return value;
  if (!required) return null;
  throw new Error(`Payment operation request is missing ${field}`);
}
