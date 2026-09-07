import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { user } from "@/db/schema/auth";
import { creditOrder, creditTransaction } from "@/db/schema/credits";
import {
  billingOutbox,
  billingPurchase,
  billingSubscription,
} from "@/db/schema/payments";
import {
  upsertBillingPurchaseIfNewer,
  upsertBillingSubscriptionIfNewer,
} from "@/payments/infrastructure/repositories/billing-store";
import { handleStripeEvent } from "@/payments/providers/stripe/webhook/handle-event";

function stripeCheckoutCompletedEvent(input: {
  eventId: string;
  eventAt: Date;
  sessionId: string;
  userId: string;
  paymentIntentId: string | null;
  paymentStatus: "paid" | "no_payment_required";
  amountCents: number;
  currency: string;
  metadata?: Record<string, string>;
}) {
  return {
    id: input.eventId,
    type: "checkout.session.completed",
    created: Math.floor(input.eventAt.getTime() / 1000),
    data: {
      object: {
        id: input.sessionId,
        mode: "payment",
        payment_status: input.paymentStatus,
        payment_intent: input.paymentIntentId,
        amount_total: input.amountCents,
        currency: input.currency,
        customer: null,
        metadata: {
          userId: input.userId,
          planId: "lifetime",
          priceId: "lifetime",
          ...input.metadata,
        },
      },
    },
  };
}

describe("billing state event ordering", () => {
  it("does not let an older subscription event overwrite a newer cancellation", async () => {
    const db = createDb(env.DB);
    const providerSubscriptionId = crypto.randomUUID();
    const canceledAt = new Date("2026-07-22T10:02:00.000Z");

    await expect(
      upsertBillingSubscriptionIfNewer(db, {
        userId: "ordering-user",
        provider: "stripe",
        providerSubscriptionId,
        providerCustomerId: "ordering-customer",
        planId: "pro",
        priceId: "monthly",
        status: "canceled",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        startedAt: null,
        endedAt: canceledAt,
        providerEventAt: canceledAt,
        providerEventId: "evt-cancel",
      }),
    ).resolves.toBeTruthy();

    await expect(
      upsertBillingSubscriptionIfNewer(db, {
        userId: "older-user",
        provider: "stripe",
        providerSubscriptionId,
        providerCustomerId: "older-customer",
        planId: "starter",
        priceId: "monthly",
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        startedAt: null,
        endedAt: null,
        providerEventAt: new Date("2026-07-22T10:01:00.000Z"),
        providerEventId: "evt-active",
      }),
    ).resolves.toBeNull();

    const [subscription] = await db
      .select()
      .from(billingSubscription)
      .where(
        and(
          eq(billingSubscription.provider, "stripe"),
          eq(billingSubscription.providerSubscriptionId, providerSubscriptionId),
        ),
      );
    expect(subscription).toMatchObject({ status: "canceled", userId: "ordering-user" });
  });

  it("uses the provider event id to break timestamp ties for purchases", async () => {
    const db = createDb(env.DB);
    const providerPaymentIntentId = crypto.randomUUID();
    const eventAt = new Date("2026-07-22T10:02:00.000Z");

    await upsertBillingPurchaseIfNewer(db, {
      userId: "ordering-user",
      provider: "stripe",
      providerPaymentIntentId,
      planId: "pro",
      priceId: "lifetime",
      status: "succeeded",
      paidAt: eventAt,
      providerEventAt: eventAt,
      providerEventId: "evt-a",
    });
    await upsertBillingPurchaseIfNewer(db, {
      userId: "ordering-user",
      provider: "stripe",
      providerPaymentIntentId,
      planId: "pro",
      priceId: "lifetime",
      status: "refunded",
      paidAt: null,
      providerEventAt: eventAt,
      providerEventId: "evt-z",
    });

    const [purchase] = await db
      .select()
      .from(billingPurchase)
      .where(
        and(
          eq(billingPurchase.provider, "stripe"),
          eq(billingPurchase.providerPaymentIntentId, providerPaymentIntentId),
        ),
      );
    expect(purchase).toMatchObject({ status: "refunded", providerEventId: "evt-z" });
  });

  it.each(["active", "trialing"] as const)(
    "does not let a same-second checkout event overwrite a %s subscription",
    async (status) => {
      const db = createDb(env.DB);
      const providerSubscriptionId = crypto.randomUUID();
      const eventAt = new Date("2026-08-20T10:02:00.000Z");
      await upsertBillingSubscriptionIfNewer(db, {
        userId: "checkout-ordering-user",
        provider: "stripe",
        providerSubscriptionId,
        providerCustomerId: "cus_lifecycle",
        planId: "pro",
        priceId: "monthly",
        status,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        startedAt: eventAt,
        endedAt: null,
        providerEventAt: eventAt,
        providerEventId: "evt-a-subscription",
      });

      await handleStripeEvent(db, {
        id: "evt-z-checkout",
        type: "checkout.session.completed",
        created: Math.floor(eventAt.getTime() / 1000),
        data: {
          object: {
            id: crypto.randomUUID(),
            mode: "subscription",
            payment_status: "paid",
            subscription: providerSubscriptionId,
            payment_intent: null,
            customer: "cus_checkout",
            metadata: {
              userId: "checkout-ordering-user",
              planId: "pro",
              priceId: "yearly",
            },
          },
        },
      });

      const [subscription] = await db
        .select()
        .from(billingSubscription)
        .where(eq(billingSubscription.providerSubscriptionId, providerSubscriptionId));
      expect(subscription).toMatchObject({
        status,
        priceId: "monthly",
        providerCustomerId: "cus_lifecycle",
        providerEventId: "evt-a-subscription",
      });
    },
  );

  it("reconciles an exact purchase replay but ignores a stale event", async () => {
    const db = createDb(env.DB);
    const userId = `purchase-replay-${crypto.randomUUID()}`;
    const providerSubscriptionId = crypto.randomUUID();
    const paymentIntentId = crypto.randomUUID();
    const eventAt = new Date("2026-08-20T11:00:00.000Z");
    await upsertBillingSubscriptionIfNewer(db, {
      userId,
      provider: "stripe",
      providerSubscriptionId,
      providerCustomerId: "cus_replay",
      planId: "pro",
      priceId: "monthly",
      status: "active",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      startedAt: eventAt,
      endedAt: null,
      providerEventAt: eventAt,
      providerEventId: "evt-subscription",
    });
    const event = stripeCheckoutCompletedEvent({
      eventId: "evt-m-purchase",
      eventAt,
      sessionId: crypto.randomUUID(),
      userId,
      paymentIntentId,
      paymentStatus: "paid",
      amountCents: 29_900,
      currency: "usd",
    });
    const outboxKey = `cancel_previous_subscription:stripe:${providerSubscriptionId}`;

    await handleStripeEvent(db, event);
    await expect(
      db.select().from(billingOutbox).where(eq(billingOutbox.deduplicationKey, outboxKey)),
    ).resolves.toHaveLength(1);

    await db.delete(billingOutbox).where(eq(billingOutbox.deduplicationKey, outboxKey));
    await handleStripeEvent(db, event);
    await expect(
      db.select().from(billingOutbox).where(eq(billingOutbox.deduplicationKey, outboxKey)),
    ).resolves.toHaveLength(1);

    await db.delete(billingOutbox).where(eq(billingOutbox.deduplicationKey, outboxKey));
    await handleStripeEvent(db, { ...event, id: "evt-a-stale" });
    await expect(
      db.select().from(billingOutbox).where(eq(billingOutbox.deduplicationKey, outboxKey)),
    ).resolves.toHaveLength(0);
    const [purchase] = await db
      .select()
      .from(billingPurchase)
      .where(eq(billingPurchase.providerPaymentIntentId, paymentIntentId));
    expect(purchase).toMatchObject({ providerEventId: "evt-m-purchase", status: "succeeded" });
  });

  it.each([
    { amountCents: 29_899, currency: "usd" },
    { amountCents: 29_900, currency: "eur" },
  ])("rejects a lifetime checkout with mismatched catalog value %#", async (mismatch) => {
    const db = createDb(env.DB);
    const paymentIntentId = crypto.randomUUID();
    const event = stripeCheckoutCompletedEvent({
      eventId: crypto.randomUUID(),
      eventAt: new Date("2026-08-20T12:00:00.000Z"),
      sessionId: crypto.randomUUID(),
      userId: `mismatch-${crypto.randomUUID()}`,
      paymentIntentId,
      paymentStatus: "paid",
      amountCents: mismatch.amountCents,
      currency: mismatch.currency,
    });

    await expect(handleStripeEvent(db, event)).rejects.toThrow(
      "amount or currency does not match",
    );
    await expect(
      db
        .select()
        .from(billingPurchase)
        .where(eq(billingPurchase.providerPaymentIntentId, paymentIntentId)),
    ).resolves.toHaveLength(0);
  });

  it("rejects a no-payment lifetime checkout without granting membership", async () => {
    const db = createDb(env.DB);
    const userId = `no-intent-${crypto.randomUUID()}`;
    const event = stripeCheckoutCompletedEvent({
      eventId: crypto.randomUUID(),
      eventAt: new Date("2026-08-20T13:00:00.000Z"),
      sessionId: crypto.randomUUID(),
      userId,
      paymentIntentId: null,
      paymentStatus: "no_payment_required",
      amountCents: 0,
      currency: "usd",
    });

    await expect(handleStripeEvent(db, event)).rejects.toThrow(
      "LIFETIME_CHECKOUT_WITHOUT_PAYMENT_INTENT_REQUIRES_MANUAL_REVIEW",
    );
    await expect(
      db.select().from(billingPurchase).where(eq(billingPurchase.userId, userId)),
    ).resolves.toHaveLength(0);
  });

  it(
    "uses a checkout-session source only for a verified credit order without a PaymentIntent",
    async () => {
      const db = createDb(env.DB);
      const userId = crypto.randomUUID();
      const orderId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      const now = new Date("2026-08-20T14:00:00.000Z");
      await db.insert(user).values({
        id: userId,
        name: "Synthetic checkout source",
        email: `${userId}@example.test`,
        emailVerified: true,
        phoneNumber: null,
        phoneNumberVerified: false,
        image: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      await db.insert(creditOrder).values({
        id: orderId,
        userId,
        packageId: "starter",
        provider: "stripe",
        providerSessionId: sessionId,
        providerPaymentId: null,
        status: "pending",
        creditAmount: 100,
        amountCents: 499,
        currency: "usd",
        ledgerTransactionId: null,
        expiresAt: null,
        createdAt: now,
        updatedAt: now,
      });

      await handleStripeEvent(
        db,
        stripeCheckoutCompletedEvent({
          eventId: crypto.randomUUID(),
          eventAt: now,
          sessionId,
          userId,
          paymentIntentId: null,
          paymentStatus: "paid",
          amountCents: 499,
          currency: "usd",
          metadata: {
            kind: "credit_purchase",
            creditPackageId: "starter",
            creditOrderId: orderId,
          },
        }),
      );

      const [order] = await db.select().from(creditOrder).where(eq(creditOrder.id, orderId));
      const [transaction] = await db
        .select()
        .from(creditTransaction)
        .where(eq(creditTransaction.sourceId, `checkout_session:${sessionId}`));
      expect(order).toMatchObject({
        status: "completed",
        providerPaymentId: `checkout_session:${sessionId}`,
      });
      expect(transaction).toMatchObject({
        userId,
        sourceProvider: "stripe",
        sourceType: "purchase",
        sourceId: `checkout_session:${sessionId}`,
      });
      await expect(
        db.select().from(billingPurchase).where(eq(billingPurchase.userId, userId)),
      ).resolves.toHaveLength(0);
    },
  );

  it("does not change subscription access when an invoice is voided", async () => {
    const db = createDb(env.DB);
    const now = new Date("2026-08-12T00:00:00.000Z");
    const providerSubscriptionId = crypto.randomUUID();
    await upsertBillingSubscriptionIfNewer(db, {
      userId: "voided-invoice-user",
      provider: "stripe",
      providerSubscriptionId,
      providerCustomerId: "voided-invoice-customer",
      planId: "pro",
      priceId: "monthly",
      status: "active",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      startedAt: now,
      endedAt: null,
      providerEventAt: now,
      providerEventId: "evt_subscription_active",
    });

    await handleStripeEvent(db, {
      id: "evt_invoice_voided",
      type: "invoice.voided",
      created: Math.floor((now.getTime() + 1000) / 1000),
      data: {
        object: {
          id: "in_voided",
          parent: { subscription_details: { subscription: providerSubscriptionId } },
        },
      },
    });

    const [subscription] = await db
      .select()
      .from(billingSubscription)
      .where(eq(billingSubscription.providerSubscriptionId, providerSubscriptionId));
    expect(subscription).toMatchObject({
      status: "active",
      providerEventId: "evt_subscription_active",
    });
  });
});
