import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { billingEvent } from "@/db/schema/payments";
import {
  alertPendingWebhookEvents,
  claimWebhookEvent,
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
    );

    const [event] = await db.select().from(billingEvent).where(eq(billingEvent.id, id));
    expect(event).toMatchObject({
      processingStatus: "pending",
      attemptCount: 1,
      lastAttemptAt: now,
      lastError: "stripe rejected [email] at [url]",
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
});
