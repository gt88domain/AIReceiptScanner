import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { createDb } from "@/db";
import { billingEvent, billingOutbox, billingSubscription } from "@/db/schema/payments";
import {
  enqueueCancelPreviousSubscription,
  processBillingOutbox,
  replayBillingOutboxJob,
} from "@/payments/application/billing-outbox";
import { getPaymentProvider } from "@/payments/providers";
import { handleWebhookEvent } from "@/payments/application/webhook-dispatch";
import {
  alertPendingWebhookEvents,
  claimWebhookEvent,
  replayWebhookEvent,
  releaseWebhookEventClaim,
} from "@/payments/application/webhook-observability";

function insertPendingEvent(id: string, firstReceivedAt: Date) {
  return createDb(env.DB).insert(billingEvent).values({
    id,
    provider: "stripe",
    providerEventId: id,
    eventType: "checkout.session.completed",
    processedAt: firstReceivedAt,
    payloadJson: "{}",
    processingStatus: "pending",
    firstReceivedAt,
    attemptCount: 0,
  });
}

describe("webhook observability", () => {
  it("dead-letters a verified Stripe partial refund once without mutating credits", async () => {
    const db = createDb(env.DB);
    const eventId = crypto.randomUUID();
    const provider = getPaymentProvider("stripe");
    const parse = vi.spyOn(provider, "parseWebhookEvent").mockResolvedValue({
      providerEventId: eventId,
      type: "charge.refunded",
      createdAt: new Date("2026-08-06T00:00:00.000Z"),
      payload: {
        id: eventId,
        type: "charge.refunded",
        created: 1_786_032_000,
        data: {
          object: {
            id: "ch_partial",
            amount: 1000,
            amount_refunded: 400,
            refunded: false,
            payment_intent: "pi_partial",
          },
        },
      },
    });
    try {
      await expect(
        handleWebhookEvent(db, { provider: "stripe", rawBody: "verified" }),
      ).rejects.toThrow("PARTIAL_REFUND_REQUIRES_MANUAL_REVIEW");
      const [event] = await db
        .select()
        .from(billingEvent)
        .where(eq(billingEvent.providerEventId, eventId));
      expect(event).toMatchObject({
        processingStatus: "dead_letter",
        attemptCount: 1,
        deadLetteredAt: expect.any(Date),
      });
      const sent: string[] = [];
      const send = async (alert: { id: string }) => {
        sent.push(alert.id);
      };
      await expect(alertPendingWebhookEvents(db, "admin@example.test", { send })).resolves.toBe(1);
      await expect(alertPendingWebhookEvents(db, "admin@example.test", { send })).resolves.toBe(0);
      expect(sent).toEqual([event!.id]);
    } finally {
      parse.mockRestore();
    }
  });

  it("atomically claims an event once and releases failures for retry", async () => {
    const db = createDb(env.DB);
    const id = crypto.randomUUID();
    const now = new Date("2026-07-17T00:00:00.000Z");
    await insertPendingEvent(id, now);

    const claim = await claimWebhookEvent(db, id, now);
    expect(claim).not.toBeNull();
    await expect(claimWebhookEvent(db, id, now)).resolves.toBeNull();
    await releaseWebhookEventClaim(
      db,
      id,
      claim!,
      new Error("stripe rejected re_secret@example.com at https://example.test?token=abc"),
      now,
    );

    const [event] = await db.select().from(billingEvent).where(eq(billingEvent.id, id));
    expect(event).toMatchObject({
      processingStatus: "pending",
      attemptCount: 1,
      lastAttemptAt: now,
      lastError: "stripe rejected [email] at [url]",
      nextRetryAt: new Date(now.getTime() + 60_000),
    });
  });

  it("alerts an old pending event once and records that delivery", async () => {
    const db = createDb(env.DB);
    const id = crypto.randomUUID();
    const now = new Date("2026-07-17T01:00:00.000Z");
    await insertPendingEvent(id, new Date(now.getTime() - 16 * 60 * 1000));
    const first = await claimWebhookEvent(db, id, now);
    await releaseWebhookEventClaim(db, id, first!, new Error("first retry"), now);
    const second = await claimWebhookEvent(db, id, now);
    await releaseWebhookEventClaim(db, id, second!, new Error("second retry"), now);

    const sent: string[] = [];
    const send = async (alert: { id: string }) => {
      sent.push(alert.id);
    };
    await expect(alertPendingWebhookEvents(db, "admin@example.test", { now, send })).resolves.toBe(
      1,
    );
    await expect(alertPendingWebhookEvents(db, "admin@example.test", { now, send })).resolves.toBe(
      0,
    );
    expect(sent).toEqual([id]);

    const [event] = await db.select().from(billingEvent).where(eq(billingEvent.id, id));
    expect(event?.alertedAt).toEqual(now);
  });

  it("claims an alert once while its email delivery is in flight", async () => {
    const db = createDb(env.DB);
    const id = crypto.randomUUID();
    const now = new Date("2026-07-17T01:30:00.000Z");
    await insertPendingEvent(id, new Date(now.getTime() - 16 * 60 * 1000));
    await db.update(billingEvent).set({ attemptCount: 2 }).where(eq(billingEvent.id, id));
    let releaseSend!: () => void;
    let signalSendStarted!: () => void;
    const sendCanFinish = new Promise<void>((resolve) => {
      releaseSend = resolve;
    });
    const sendStarted = new Promise<void>((resolve) => {
      signalSendStarted = resolve;
    });
    let sends = 0;
    const send = async () => {
      sends += 1;
      signalSendStarted();
      await sendCanFinish;
    };

    const first = alertPendingWebhookEvents(db, "admin@example.test", { now, send });
    await sendStarted;
    await expect(alertPendingWebhookEvents(db, "admin@example.test", { now, send })).resolves.toBe(
      0,
    );
    releaseSend();
    await expect(first).resolves.toBe(1);

    expect(sends).toBe(1);
    const [event] = await db.select().from(billingEvent).where(eq(billingEvent.id, id));
    expect(event).toMatchObject({ alertedAt: now, alertLeaseToken: null, alertLeaseUntil: null });
  });

  it("dead-letters bounded failures and only an administrator replay reopens them", async () => {
    const db = createDb(env.DB);
    const id = crypto.randomUUID();
    const now = new Date("2026-07-17T02:00:00.000Z");
    await insertPendingEvent(id, now);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const claim = await claimWebhookEvent(db, id, now);
      expect(claim).not.toBeNull();
      await releaseWebhookEventClaim(db, id, claim!, new Error("provider unavailable"), now);
    }

    const [deadLetter] = await db.select().from(billingEvent).where(eq(billingEvent.id, id));
    expect(deadLetter).toMatchObject({ processingStatus: "dead_letter", attemptCount: 8 });
    expect(await replayWebhookEvent(db, id, now)).toBe(true);

    const [replayed] = await db.select().from(billingEvent).where(eq(billingEvent.id, id));
    expect(replayed).toMatchObject({ processingStatus: "pending", attemptCount: 0 });
  });

  it("does not let an expired webhook claim release a newer claim", async () => {
    const db = createDb(env.DB);
    const id = crypto.randomUUID();
    const now = new Date("2026-07-17T03:00:00.000Z");
    await insertPendingEvent(id, now);
    const first = await claimWebhookEvent(db, id, now);
    expect(first).not.toBeNull();
    await db
      .update(billingEvent)
      .set({ leaseUntil: new Date(now.getTime() - 1) })
      .where(eq(billingEvent.id, id));
    const second = await claimWebhookEvent(db, id, new Date(now.getTime() + 1));
    expect(second).not.toBeNull();
    await releaseWebhookEventClaim(db, id, first!, new Error("late worker failure"), now);

    const [event] = await db.select().from(billingEvent).where(eq(billingEvent.id, id));
    expect(event).toMatchObject({ processingStatus: "processing", leaseToken: second!.token });
  });

  it("deduplicates and reopens provider side-effect jobs without calling a provider in a webhook", async () => {
    const db = createDb(env.DB);
    const subscriptionId = crypto.randomUUID();
    await enqueueCancelPreviousSubscription(db, { provider: "stripe", subscriptionId });
    await enqueueCancelPreviousSubscription(db, { provider: "stripe", subscriptionId });

    const jobs = await db.select().from(billingOutbox);
    expect(jobs).toHaveLength(1);
    const job = jobs[0];
    if (!job) throw new Error("Expected billing outbox job");
    expect(job.processingStatus).toBe("pending");
    await db
      .update(billingOutbox)
      .set({ processingStatus: "dead_letter", attemptCount: 8 })
      .where(eq(billingOutbox.id, job.id));
    expect(await replayBillingOutboxJob(db, job.id)).toBe(true);
    const [replayed] = await db.select().from(billingOutbox).where(eq(billingOutbox.id, job.id));
    expect(replayed).toMatchObject({ processingStatus: "pending", attemptCount: 0 });
    await db
      .update(billingOutbox)
      .set({ processingStatus: "processed" })
      .where(eq(billingOutbox.id, job.id));
  });

  it("fences a late billing outbox completion after its lease is reclaimed", async () => {
    const db = createDb(env.DB);
    const now = new Date();
    const subscriptionId = crypto.randomUUID();
    await enqueueCancelPreviousSubscription(db, { provider: "stripe", subscriptionId });
    await db.insert(billingSubscription).values({
      id: crypto.randomUUID(),
      userId: "billing-outbox-user",
      provider: "stripe",
      providerSubscriptionId: subscriptionId,
      providerCustomerId: "customer",
      planId: "pro",
      priceId: "monthly",
      status: "active",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      startedAt: null,
      endedAt: null,
      providerEventAt: null,
      providerEventId: null,
      createdAt: now,
      updatedAt: now,
    });
    let releaseFirst!: () => void;
    let signalFirstStarted!: () => void;
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const firstStarted = new Promise<void>((resolve) => {
      signalFirstStarted = resolve;
    });
    let calls = 0;
    const provider = getPaymentProvider("stripe");
    const cancel = vi
      .spyOn(provider, "setSubscriptionCancelAtPeriodEnd")
      .mockImplementation(async () => {
        calls += 1;
        if (calls === 1) {
          signalFirstStarted();
          await firstCanFinish;
        }
      });

    try {
      const first = processBillingOutbox(db, now);
      await firstStarted;
      const [outbox] = await db
        .select()
        .from(billingOutbox)
        .where(
          eq(
            billingOutbox.deduplicationKey,
            `cancel_previous_subscription:stripe:${subscriptionId}`,
          ),
        );
      await db
        .update(billingOutbox)
        .set({ leaseUntil: new Date(now.getTime() - 60_000) })
        .where(eq(billingOutbox.id, outbox!.id));
      await processBillingOutbox(db, new Date(now.getTime() + 60_000));
      releaseFirst();
      await expect(first).resolves.toBe(0);

      const [persistedOutbox] = await db
        .select()
        .from(billingOutbox)
        .where(eq(billingOutbox.id, outbox!.id));
      const [subscription] = await db
        .select()
        .from(billingSubscription)
        .where(eq(billingSubscription.providerSubscriptionId, subscriptionId));
      expect(calls).toBe(2);
      expect(persistedOutbox).toMatchObject({ processingStatus: "processed", attemptCount: 2 });
      expect(subscription).toMatchObject({ cancelAtPeriodEnd: true });
    } finally {
      cancel.mockRestore();
    }
  });
});
