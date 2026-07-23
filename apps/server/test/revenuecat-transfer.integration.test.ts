import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { user } from "@/db/schema/auth";
import { billingPurchase, billingSubscription, revenueCatIdentity } from "@/db/schema/payments";
import { handleRevenueCatEvent } from "@/payments/providers/revenuecat/webhook/handle-event";

async function insertUser(id: string) {
  const now = new Date();
  await createDb(env.DB)
    .insert(user)
    .values({
      id,
      name: id,
      email: `${id}@example.test`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
}

describe("RevenueCat transfers", () => {
  it("moves RevenueCat billing state only to a uniquely identified destination account", async () => {
    const db = createDb(env.DB);
    const fromUserId = crypto.randomUUID();
    const toUserId = crypto.randomUUID();
    const now = new Date("2026-07-22T12:00:00.000Z");
    await Promise.all([insertUser(fromUserId), insertUser(toUserId)]);
    await db.insert(revenueCatIdentity).values([
      {
        providerAppUserId: fromUserId,
        userId: fromUserId,
        status: "active",
        transferEventId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        providerAppUserId: toUserId,
        userId: toUserId,
        status: "active",
        transferEventId: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await db.insert(billingSubscription).values({
      id: crypto.randomUUID(),
      userId: fromUserId,
      provider: "revenuecat",
      providerSubscriptionId: crypto.randomUUID(),
      providerCustomerId: fromUserId,
      planId: "pro",
      priceId: "monthly",
      status: "active",
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(billingPurchase).values({
      id: crypto.randomUUID(),
      userId: fromUserId,
      provider: "revenuecat",
      providerPaymentIntentId: crypto.randomUUID(),
      planId: "pro",
      priceId: "lifetime",
      status: "succeeded",
      createdAt: now,
      updatedAt: now,
    });

    await handleRevenueCatEvent(db, {
      event: {
        id: crypto.randomUUID(),
        type: "TRANSFER",
        event_timestamp_ms: now.getTime(),
        transferred_from: [fromUserId],
        transferred_to: [toUserId],
      },
    });

    const [subscription] = await db
      .select()
      .from(billingSubscription)
      .where(
        and(
          eq(billingSubscription.provider, "revenuecat"),
          eq(billingSubscription.userId, toUserId),
        ),
      );
    const [purchase] = await db
      .select()
      .from(billingPurchase)
      .where(and(eq(billingPurchase.provider, "revenuecat"), eq(billingPurchase.userId, toUserId)));
    const [sourceIdentity] = await db
      .select()
      .from(revenueCatIdentity)
      .where(eq(revenueCatIdentity.providerAppUserId, fromUserId));

    expect(subscription).toBeDefined();
    expect(purchase).toBeDefined();
    expect(sourceIdentity).toMatchObject({ status: "transferred", userId: fromUserId });
  });
});
