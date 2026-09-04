import type { Database } from "@/db";
import { billingCheckoutSession } from "@/db/schema/payments";
import { findPlanById, findPriceById } from "../domain/plan-catalog";
import { evaluateCheckoutDecision } from "../domain/policy";
import {
  findBillingCustomer,
  hasTrialConsumingSubscriptionHistory,
} from "../infrastructure/repositories/billing-store";
import { getPaymentProvider, resolvePaymentProviderKey } from "../providers";
import { getBillingStatus } from "./billing-status";
import {
  claimPaymentOperation,
  completePaymentOperation,
  createPaymentOperationRequest,
  failPaymentOperation,
  getOrCreatePaymentOperation,
  readCheckoutOperationResult,
  savePaymentOperationProviderResult,
} from "./payment-operation";
import { createCheckoutDecisionBlockedError, type CreateCheckoutServiceInput } from "./types";

export async function createCheckoutSession(db: Database, input: CreateCheckoutServiceInput) {
  const now = new Date();
  const plan = findPlanById(input.planId);
  if (!plan || plan.status !== "active") {
    throw new Error("Plan not available");
  }
  const price = findPriceById(input.priceId);
  if (!price || price.planId !== plan.id || price.status !== "active") {
    throw new Error("Price not available");
  }
  if (input.provider && price.provider !== input.provider) {
    throw new Error("Price provider mismatch");
  }

  const resolvedProvider = price.provider;
  const resolvedProviderKey = resolvePaymentProviderKey(input.provider ?? resolvedProvider);
  const billingStatus = await getBillingStatus(db, input.user);
  const checkoutDecision = evaluateCheckoutDecision({
    currentEntitlement: {
      tier: billingStatus.currentEntitlement.tier,
      source: billingStatus.currentEntitlement.source,
      planId: billingStatus.activePlan?.id ?? null,
      priceId: billingStatus.activePrice?.id ?? null,
    },
    targetPrice: { priceType: price.priceType, interval: price.interval ?? null },
  });
  const isCrossProviderSubscriptionUpgrade =
    checkoutDecision.action === "upgrade" &&
    billingStatus.billingProvider !== null &&
    billingStatus.billingProvider !== resolvedProviderKey;
  if (checkoutDecision.action !== "checkout" && !isCrossProviderSubscriptionUpgrade) {
    throw createCheckoutDecisionBlockedError(checkoutDecision.reason);
  }

  const provider = getPaymentProvider(resolvedProviderKey);
  const existingCustomer = await findBillingCustomer(db, {
    userId: input.user.userId,
    provider: resolvedProviderKey,
  });
  const hasConsumedTrial =
    price.priceType === "subscription" && price.trialDays
      ? await hasTrialConsumingSubscriptionHistory(db, {
          userId: input.user.userId,
        })
      : false;
  const canApplyStripeTrial =
    resolvedProviderKey === "stripe" && price.priceType === "subscription" && price.trialDays;
  const resolvedTrialDays = canApplyStripeTrial && !hasConsumedTrial ? price.trialDays : null;
  const operationId = input.operationId ?? crypto.randomUUID();
  const operationRequest = await createPaymentOperationRequest({
    provider: resolvedProviderKey,
    mode: price.priceType === "subscription" ? "subscription" : "payment",
    planId: plan.id,
    priceId: price.id,
    providerPriceId: price.providerPriceId,
    lineItems: [{ priceId: price.providerPriceId, quantity: 1 }],
    currency: price.currency,
    trialDays: resolvedTrialDays,
    successUrl: new URL(input.successUrl).toString(),
    cancelUrl: new URL(input.cancelUrl).toString(),
    customerReference: existingCustomer?.providerCustomerId ?? null,
  });
  let operation = await getOrCreatePaymentOperation(db, {
    userId: input.user.userId,
    provider: resolvedProviderKey,
    operationType: "checkout",
    operationId,
    ...operationRequest,
    idempotencyMode:
      provider.capabilities.checkoutIdempotency === "native" ? "native" : "local_only",
    relatedResourceType: "checkout_session",
  });
  if (operation.status === "completed" || operation.status === "provider_succeeded") {
    const stored = readCheckoutOperationResult(operation);
    if (operation.status === "provider_succeeded") {
      await finalizeCheckoutSession(
        db,
        operation,
        plan.id,
        price.id,
        price.priceType === "subscription" ? "subscription" : "payment",
        stored,
        now,
      );
      await completePaymentOperation(db, operation.id, now);
    }
    return { ...stored, expiresAt: stored.expiresAt ? new Date(stored.expiresAt) : null };
  }
  const claim = await claimPaymentOperation(db, operation, now);
  if (!claim) {
    operation = (await getOrCreatePaymentOperation(db, {
      userId: input.user.userId,
      provider: resolvedProviderKey,
      operationType: "checkout",
      operationId,
      ...operationRequest,
      idempotencyMode:
        provider.capabilities.checkoutIdempotency === "native" ? "native" : "local_only",
      relatedResourceType: "checkout_session",
    }))!;
    const stored = readCheckoutOperationResult(operation);
    return { ...stored, expiresAt: stored.expiresAt ? new Date(stored.expiresAt) : null };
  }

  try {
    const session = await provider.createCheckoutSession({
      mode: price.priceType === "subscription" ? "subscription" : "payment",
      lineItems: [{ priceId: price.providerPriceId, quantity: 1 }],
      currency: price.currency,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      metadata: {
        paymentOperationId: claim.operation.id,
        checkoutSessionId: claim.operation.id,
        userId: input.user.userId,
        planId: plan.id,
        priceId: price.id,
        provider: resolvedProviderKey,
      },
      trialDays: resolvedTrialDays,
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
    const succeeded = await savePaymentOperationProviderResult(
      db,
      claim.operation.id,
      claim.token,
      stored,
      new Date(),
    );
    await finalizeCheckoutSession(
      db,
      succeeded,
      plan.id,
      price.id,
      price.priceType === "subscription" ? "subscription" : "payment",
      stored,
      new Date(),
    );
    await completePaymentOperation(db, succeeded.id, new Date());
    return session;
  } catch (error) {
    await failPaymentOperation(
      db,
      claim.operation.id,
      claim.token,
      error,
      claim.operation.idempotencyMode === "local_only",
    );
    throw error;
  }
}

async function finalizeCheckoutSession(
  db: Database,
  operation: {
    id: string;
    userId: string;
    provider: typeof billingCheckoutSession.$inferSelect.provider;
  },
  planId: string,
  priceId: string,
  mode: "subscription" | "payment",
  result: { providerSessionId: string; expiresAt: string | null },
  now: Date,
) {
  await db
    .insert(billingCheckoutSession)
    .values({
      id: operation.id,
      userId: operation.userId,
      provider: operation.provider,
      providerSessionId: result.providerSessionId,
      planId,
      priceId,
      mode,
      status: "created",
      expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}
