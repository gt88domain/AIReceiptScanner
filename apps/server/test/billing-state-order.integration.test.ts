import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { billingPurchase, billingSubscription } from "@/db/schema/payments";
import {
  upsertBillingPurchaseIfNewer,
  upsertBillingSubscriptionIfNewer,
} from "@/payments/infrastructure/repositories/billing-store";
import { handleStripeEvent } from "@/payments/providers/stripe/webhook/handle-event";

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
    expect(subscription).toMatchObject({ status: "active", providerEventId: "evt_subscription_active" });
  });
});
