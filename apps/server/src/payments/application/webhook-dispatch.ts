import { and, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { billingEvent } from "@/db/schema/payments";
import { getPaymentProvider } from "../providers";
import { handleCreemEvent } from "../providers/creem/webhook/handle-event";
import { handleRevenueCatEvent } from "../providers/revenuecat/webhook/handle-event";
import { handleStripeEvent } from "../providers/stripe/webhook/handle-event";
import { handleWaffoEvent } from "../providers/waffo/webhook/handle-event";
import { claimWebhookEvent, releaseWebhookEventClaim } from "./webhook-observability";
import type { HandleWebhookInput } from "./types";

export async function handleWebhookEvent(db: Database, input: HandleWebhookInput) {
  const provider = getPaymentProvider(input.provider);
  const parsed = await provider.parseWebhookEvent({
    signature: input.signature,
    rawBody: input.rawBody,
  });
  const now = new Date();
  const inserted = await db
    .insert(billingEvent)
    .values({
      id: crypto.randomUUID(),
      provider: input.provider,
      providerEventId: parsed.providerEventId,
      eventType: parsed.type,
      processedAt: parsed.createdAt,
      payloadJson: JSON.stringify({
        provider: input.provider,
        providerEventId: parsed.providerEventId,
        eventType: parsed.type,
        createdAt: parsed.createdAt.toISOString(),
      }),
      processingStatus: "pending",
      firstReceivedAt: now,
      attemptCount: 0,
    })
    .onConflictDoNothing({ target: [billingEvent.provider, billingEvent.providerEventId] })
    .returning({ id: billingEvent.id });

  const eventRowId = inserted[0]?.id;
  if (!eventRowId) {
    const [existing] = await db
      .select({ id: billingEvent.id })
      .from(billingEvent)
      .where(
        and(
          eq(billingEvent.provider, input.provider),
          eq(billingEvent.providerEventId, parsed.providerEventId),
        ),
      )
      .limit(1);
    if (!existing)
      throw new Error(
        `Billing event lookup failed after insert conflict for ${parsed.providerEventId}`,
      );
    if (!(await claimWebhookEvent(db, existing.id, now)))
      return { received: true, duplicate: true };
    return dispatchClaimedWebhookEvent(db, input, parsed.payload, existing.id, now);
  }

  if (!(await claimWebhookEvent(db, eventRowId, now))) return { received: true, duplicate: true };
  return dispatchClaimedWebhookEvent(db, input, parsed.payload, eventRowId, now);
}

async function dispatchClaimedWebhookEvent(
  db: Database,
  input: HandleWebhookInput,
  payload: unknown,
  eventRowId: string,
  now: Date,
) {
  try {
    switch (input.provider) {
      case "stripe":
        await handleStripeEvent(db, payload);
        break;
      case "creem":
        await handleCreemEvent(db, payload);
        break;
      case "waffo":
        await handleWaffoEvent(db, payload);
        break;
      case "revenuecat":
        await handleRevenueCatEvent(db, payload);
        break;
    }
  } catch (error) {
    try {
      await releaseWebhookEventClaim(db, eventRowId, error, now);
    } catch (recordError) {
      console.error("Failed to record webhook processing failure", recordError);
    }
    throw error;
  }

  await db
    .update(billingEvent)
    .set({ processingStatus: "processed", leaseUntil: null, nextRetryAt: null })
    .where(eq(billingEvent.id, eventRowId));
  return { received: true, duplicate: false };
}
