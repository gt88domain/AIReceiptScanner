import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { billingEvent } from "@/db/schema/payments";
import { handleWebhookEvent } from "@/payments/application/webhook-dispatch";

describe("payment webhook idempotency", () => {
  it("records a verified RevenueCat event once and skips its duplicate delivery", async () => {
    const eventId = crypto.randomUUID();
    const rawBody = JSON.stringify({
      api_version: "1.0",
      event: {
        id: eventId,
        type: "TEST",
        event_timestamp_ms: Date.now(),
        product_id: "template-test-product",
      },
    });
    const input = {
      provider: "revenuecat" as const,
      rawBody,
      signature: "test-revenuecat-webhook-secret",
    };
    const db = createDb(env.DB);

    await expect(handleWebhookEvent(db, input)).resolves.toEqual({
      received: true,
      duplicate: false,
    });
    await expect(handleWebhookEvent(db, input)).resolves.toEqual({
      received: true,
      duplicate: true,
    });

    const rows = await db
      .select()
      .from(billingEvent)
      .where(eq(billingEvent.providerEventId, eventId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ provider: "revenuecat", processingStatus: "processed" });
  });
});
