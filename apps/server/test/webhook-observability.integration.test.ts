import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { billingEvent, billingOutbox } from "@/db/schema/payments";
import {
  enqueueCancelPreviousSubscription,
  replayBillingOutboxJob,
} from "@/payments/application/billing-outbox";
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
  it("atomically claims an event once and releases failures for retry", async () => {
    const db = createDb(env.DB);
    const id = crypto.randomUUID();
    const now = new Date("2026-07-17T00:00:00.000Z");
    await insertPendingEvent(id, now);

    await expect(claimWebhookEvent(db, id, now)).resolves.toBe(true);
    await expect(claimWebhookEvent(db, id, now)).resolves.toBe(false);
    await releaseWebhookEventClaim(
      db,
      id,
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
    await claimWebhookEvent(db, id, now);
    await releaseWebhookEventClaim(db, id, new Error("first retry"), now);
    await claimWebhookEvent(db, id, now);
    await releaseWebhookEventClaim(db, id, new Error("second retry"), now);

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

  it("dead-letters bounded failures and only an administrator replay reopens them", async () => {
    const db = createDb(env.DB);
    const id = crypto.randomUUID();
    const now = new Date("2026-07-17T02:00:00.000Z");
    await insertPendingEvent(id, now);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      expect(await claimWebhookEvent(db, id, now)).toBe(true);
      await releaseWebhookEventClaim(db, id, new Error("provider unavailable"), now);
    }

    const [deadLetter] = await db.select().from(billingEvent).where(eq(billingEvent.id, id));
    expect(deadLetter).toMatchObject({ processingStatus: "dead_letter", attemptCount: 8 });
    expect(await replayWebhookEvent(db, id, now)).toBe(true);

    const [replayed] = await db.select().from(billingEvent).where(eq(billingEvent.id, id));
    expect(replayed).toMatchObject({ processingStatus: "pending", attemptCount: 0 });
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
  });
});
