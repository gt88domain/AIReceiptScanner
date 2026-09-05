import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { createCreditCheckoutSession } from "@/credits";
import { createDb } from "@/db";
import { user } from "@/db/schema/auth";
import { billingCustomer, billingSubscription, paymentOperation } from "@/db/schema/payments";
import {
  createPaymentOperationRequest,
  getOrCreatePaymentOperation,
  readPaymentOperationRequest,
} from "@/payments/application/payment-operation";
import { reconcilePaymentOperations } from "@/payments/application/payment-operation-recovery";
import { upgradeSubscription } from "@/payments/application/upgrade";
import { findPriceById } from "@/payments/domain/plan-catalog";
import { getPaymentProvider } from "@/payments/providers";

async function insertUser(label: string) {
  const db = createDb(env.DB);
  const now = new Date();
  const userId = crypto.randomUUID();
  await db.insert(user).values({
    id: userId,
    name: label,
    email: `${userId}@example.test`,
    emailVerified: true,
    phoneNumber: null,
    phoneNumberVerified: false,
    image: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  return { db, now, userId };
}

async function insertMonthlySubscription(
  db: ReturnType<typeof createDb>,
  userId: string,
  now: Date,
) {
  const id = crypto.randomUUID();
  await db.insert(billingSubscription).values({
    id,
    userId,
    provider: "stripe",
    providerSubscriptionId: `sub_${crypto.randomUUID()}`,
    providerCustomerId: `cus_${crypto.randomUUID()}`,
    planId: "pro",
    priceId: "monthly",
    status: "active",
    currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    startedAt: now,
    endedAt: null,
    providerEventAt: now,
    providerEventId: `evt_${crypto.randomUUID()}`,
    createdAt: now,
    updatedAt: now,
  });
  const [subscription] = await db
    .select()
    .from(billingSubscription)
    .where(eq(billingSubscription.id, id));
  return subscription!;
}

describe("payment operation recovery payloads", () => {
  it("recovers a new upgrade with the provider price and stores the local price", async () => {
    const { db, now, userId } = await insertUser("New Upgrade Recovery");
    const subscription = await insertMonthlySubscription(db, userId, now);
    const monthly = findPriceById("monthly")!;
    const yearly = findPriceById("yearly")!;
    const operationId = crypto.randomUUID();
    const provider = getPaymentProvider("stripe");
    const update = vi
      .spyOn(provider, "updateSubscriptionPlan")
      .mockRejectedValueOnce(new Error("provider timeout"))
      .mockResolvedValueOnce(undefined);

    try {
      await expect(
        upgradeSubscription(db, {
          user: { userId },
          planId: "pro",
          priceId: "yearly",
          provider: "stripe",
          operationId,
        }),
      ).rejects.toThrow("provider timeout");
      await expect(
        reconcilePaymentOperations(db, new Date(Date.now() + 2 * 60 * 1000)),
      ).resolves.toBe(1);

      expect(update).toHaveBeenCalledTimes(2);
      expect(update.mock.calls[1]![0]).toEqual(update.mock.calls[0]![0]);
      expect(update.mock.calls[1]![0]).toMatchObject({
        subscriptionId: subscription.providerSubscriptionId,
        currentPriceId: monthly.providerPriceId,
        targetPriceId: yearly.providerPriceId,
      });
      const [storedSubscription] = await db
        .select()
        .from(billingSubscription)
        .where(eq(billingSubscription.id, subscription.id));
      const [storedOperation] = await db
        .select()
        .from(paymentOperation)
        .where(
          eq(
            paymentOperation.operationKey,
            `${userId}:subscription_upgrade:${operationId}`,
          ),
        );
      expect(storedSubscription).toMatchObject({ planId: "pro", priceId: "yearly" });
      expect(readPaymentOperationRequest(storedOperation!)).toMatchObject({
        targetPlanId: "pro",
        targetPriceId: "yearly",
        targetProviderPriceId: yearly.providerPriceId,
      });
      expect(storedOperation).toMatchObject({ status: "completed" });
    } finally {
      update.mockRestore();
    }
  });

  it("recovers a legacy upgrade whose targetPriceId contains the provider price", async () => {
    const { db, now, userId } = await insertUser("Legacy Upgrade Recovery");
    const subscription = await insertMonthlySubscription(db, userId, now);
    const monthly = findPriceById("monthly")!;
    const yearly = findPriceById("yearly")!;
    const operationId = crypto.randomUUID();
    const request = await createPaymentOperationRequest({
      provider: "stripe",
      subscriptionId: subscription.providerSubscriptionId,
      expectedCurrentPriceId: monthly.id,
      expectedCurrentProviderPriceId: monthly.providerPriceId,
      targetPlanId: "pro",
      targetPriceId: yearly.providerPriceId,
    });
    const operation = await getOrCreatePaymentOperation(db, {
      userId,
      provider: "stripe",
      operationType: "subscription_upgrade",
      operationId,
      ...request,
      idempotencyMode: "native",
      scopeKey: `subscription:stripe:${subscription.providerSubscriptionId}`,
      relatedResourceType: "subscription",
      relatedResourceId: subscription.id,
    });
    const provider = getPaymentProvider("stripe");
    const update = vi.spyOn(provider, "updateSubscriptionPlan").mockResolvedValue(undefined);

    try {
      await expect(reconcilePaymentOperations(db, now)).resolves.toBe(1);
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: subscription.providerSubscriptionId,
          currentPriceId: monthly.providerPriceId,
          targetPriceId: yearly.providerPriceId,
        }),
      );
      const [storedSubscription] = await db
        .select()
        .from(billingSubscription)
        .where(eq(billingSubscription.id, subscription.id));
      const [storedOperation] = await db
        .select()
        .from(paymentOperation)
        .where(eq(paymentOperation.id, operation.id));
      expect(storedSubscription).toMatchObject({ planId: "pro", priceId: "yearly" });
      expect(storedOperation).toMatchObject({ status: "completed" });
    } finally {
      update.mockRestore();
    }
  });

  it("repairs a v4 provider price stored locally before allowing the next upgrade", async () => {
    const { db, now, userId } = await insertUser("V4 Completed Upgrade Repair");
    const subscription = await insertMonthlySubscription(db, userId, now);
    const monthly = findPriceById("monthly")!;
    const yearly = findPriceById("yearly")!;
    await db
      .update(billingSubscription)
      .set({ priceId: monthly.providerPriceId })
      .where(eq(billingSubscription.id, subscription.id));
    const provider = getPaymentProvider("stripe");
    const update = vi.spyOn(provider, "updateSubscriptionPlan").mockImplementation(async () => {
      const [repairedBeforeProviderCall] = await db
        .select({ priceId: billingSubscription.priceId })
        .from(billingSubscription)
        .where(eq(billingSubscription.id, subscription.id));
      expect(repairedBeforeProviderCall?.priceId).toBe(monthly.id);
    });

    try {
      await expect(
        upgradeSubscription(db, {
          user: { userId },
          planId: "pro",
          priceId: "yearly",
          provider: "stripe",
          operationId: crypto.randomUUID(),
        }),
      ).resolves.toBeUndefined();
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: subscription.providerSubscriptionId,
          currentPriceId: monthly.providerPriceId,
          targetPriceId: yearly.providerPriceId,
        }),
      );
      const [storedSubscription] = await db
        .select()
        .from(billingSubscription)
        .where(eq(billingSubscription.id, subscription.id));
      expect(storedSubscription).toMatchObject({ planId: "pro", priceId: yearly.id });
    } finally {
      update.mockRestore();
    }
  });

  it("recovers an ordinary checkout with its trial and customer snapshot", async () => {
    const { db, now, userId } = await insertUser("Checkout Recovery");
    const monthly = findPriceById("monthly")!;
    const operationId = crypto.randomUUID();
    const request = await createPaymentOperationRequest({
      provider: "stripe",
      mode: "subscription",
      planId: "pro",
      priceId: monthly.id,
      providerPriceId: monthly.providerPriceId,
      currency: monthly.currency,
      trialDays: 14,
      successUrl: "https://app.example.test/billing/success",
      cancelUrl: "https://app.example.test/billing/cancel",
      customerReference: "cus_recovery",
      customerEmail: "recovery@example.test",
    });
    const operation = await getOrCreatePaymentOperation(db, {
      userId,
      provider: "stripe",
      operationType: "checkout",
      operationId,
      ...request,
      idempotencyMode: "native",
      relatedResourceType: "checkout_session",
    });
    const provider = getPaymentProvider("stripe");
    const createCheckout = vi.spyOn(provider, "createCheckoutSession").mockResolvedValue({
      providerSessionId: "cs_recovery",
      url: "https://checkout.example.test/recovery",
      expiresAt: null,
    });

    try {
      await expect(reconcilePaymentOperations(db, now)).resolves.toBe(1);
      expect(createCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          lineItems: [{ priceId: monthly.providerPriceId, quantity: 1 }],
          trialDays: 14,
          customerId: "cus_recovery",
          customerEmail: "recovery@example.test",
        }),
      );
      const [storedOperation] = await db
        .select()
        .from(paymentOperation)
        .where(eq(paymentOperation.id, operation.id));
      expect(storedOperation).toMatchObject({ status: "completed" });
    } finally {
      createCheckout.mockRestore();
    }
  });

  it("replays a credit checkout with the same selected price and customer snapshot", async () => {
    const { db, userId } = await insertUser("Credit Checkout Recovery");
    await db.insert(billingCustomer).values({
      id: crypto.randomUUID(),
      userId,
      provider: "stripe",
      providerCustomerId: "cus_credit_recovery",
      email: "credit-recovery@example.test",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const operationId = crypto.randomUUID();
    const provider = getPaymentProvider("stripe");
    const createCheckout = vi
      .spyOn(provider, "createCheckoutSession")
      .mockRejectedValueOnce(new Error("provider timeout"))
      .mockResolvedValueOnce({
        providerSessionId: "cs_credit_recovery",
        url: "https://checkout.example.test/credit-recovery",
        expiresAt: null,
      });

    try {
      await expect(
        createCreditCheckoutSession(db, {
          user: { userId },
          packageId: "starter",
          returnUrl: "https://app.example.test/credits",
          provider: "stripe",
          customerEmail: "ignored@example.test",
          operationId,
        }),
      ).rejects.toThrow("provider timeout");
      await expect(
        reconcilePaymentOperations(db, new Date(Date.now() + 2 * 60 * 1000)),
      ).resolves.toBe(1);

      expect(createCheckout).toHaveBeenCalledTimes(2);
      expect(createCheckout.mock.calls[1]![0]).toEqual(createCheckout.mock.calls[0]![0]);
      expect(createCheckout.mock.calls[1]![0]).toMatchObject({
        mode: "payment",
        lineItems: [
          {
            priceId: "replace-with-stripe-live-starter-credits-price-id",
            quantity: 1,
          },
        ],
        customerId: "cus_credit_recovery",
        customerEmail: "credit-recovery@example.test",
      });
      const [storedOperation] = await db
        .select()
        .from(paymentOperation)
        .where(
          eq(paymentOperation.operationKey, `${userId}:credit_checkout:${operationId}`),
        );
      expect(storedOperation).toMatchObject({ status: "completed" });
    } finally {
      createCheckout.mockRestore();
    }
  });
});
