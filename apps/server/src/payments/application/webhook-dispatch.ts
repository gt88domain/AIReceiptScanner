import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import type { ServerPaymentProviderKey } from "@repo/app-config";
import type { Database } from "@/db";
import { billingEvent } from "@/db/schema/payments";
import { logSafeError } from "@/lib/safe-error";
import { getPaymentProvider } from "../providers";
import { handleRevenueCatEvent } from "../providers/revenuecat/webhook/handle-event";
import { handleStripeEvent } from "../providers/stripe/webhook/handle-event";
import { claimWebhookEvent, releaseWebhookEventClaim } from "./webhook-observability";
import type { HandleWebhookInput } from "./types";

const WEBHOOK_HANDLER_VERSION = 1;
const SCHEDULED_WEBHOOK_BATCH_SIZE = 20;

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
      payloadJson: JSON.stringify(parsed.payload),
      handlerVersion: WEBHOOK_HANDLER_VERSION,
      processingStatus: "pending",
      firstReceivedAt: now,
      attemptCount: 0,
    })
    .onConflictDoNothing({ target: [billingEvent.provider, billingEvent.providerEventId] })
    .returning({ id: billingEvent.id });

  const eventRowId =
    inserted[0]?.id ?? (await findWebhookEventId(db, input.provider, parsed.providerEventId));
  if (!eventRowId) {
    throw new Error(
      `Billing event lookup failed after insert conflict for ${parsed.providerEventId}`,
    );
  }
  const claim = await claimWebhookEvent(db, eventRowId, now);
  if (!claim) {
    return { received: true, duplicate: true };
  }
  return dispatchClaimedWebhookEvent(
    db,
    input.provider,
    parsed.payload,
    eventRowId,
    claim,
    now,
    true,
  );
}

async function findWebhookEventId(
  db: Database,
  provider: ServerPaymentProviderKey,
  providerEventId: string,
) {
  const [existing] = await db
    .select({ id: billingEvent.id })
    .from(billingEvent)
    .where(
      and(eq(billingEvent.provider, provider), eq(billingEvent.providerEventId, providerEventId)),
    )
    .limit(1);
  return existing?.id;
}

async function dispatchWebhookPayload(
  db: Database,
  provider: ServerPaymentProviderKey,
  payload: unknown,
) {
  switch (provider) {
    case "stripe":
      await handleStripeEvent(db, payload);
      break;
    case "revenuecat":
      await handleRevenueCatEvent(db, payload);
      break;
    default:
      throw new Error(`Payment provider is not active: ${String(provider)}`);
  }
}

async function dispatchClaimedWebhookEvent(
  db: Database,
  provider: ServerPaymentProviderKey,
  payload: unknown,
  eventRowId: string,
  claim: NonNullable<Awaited<ReturnType<typeof claimWebhookEvent>>>,
  now: Date,
  rethrow: boolean,
) {
  try {
    await dispatchWebhookPayload(db, provider, payload);
  } catch (error) {
    try {
      await releaseWebhookEventClaim(db, eventRowId, claim, error, now);
    } catch (recordError) {
      logSafeError("Failed to record webhook processing failure", recordError, { eventRowId });
    }
    if (rethrow) throw error;
    return false;
  }

  const [completed] = await db
    .update(billingEvent)
    .set({ processingStatus: "processed", leaseToken: null, leaseUntil: null, nextRetryAt: null })
    .where(
      and(
        eq(billingEvent.id, eventRowId),
        eq(billingEvent.processingStatus, "processing"),
        eq(billingEvent.leaseToken, claim.token),
      ),
    )
    .returning({ id: billingEvent.id });
  return Boolean(completed);
}

/** Replays due inbox events from D1 after a bounded backoff or an expired lease. */
export async function processPendingWebhookEvents(db: Database, now = new Date()) {
  const events = await db
    .select({
      id: billingEvent.id,
      provider: billingEvent.provider,
      payloadJson: billingEvent.payloadJson,
    })
    .from(billingEvent)
    .where(
      or(
        and(
          eq(billingEvent.processingStatus, "pending"),
          or(isNull(billingEvent.nextRetryAt), lte(billingEvent.nextRetryAt, now)),
        ),
        and(
          eq(billingEvent.processingStatus, "processing"),
          or(isNull(billingEvent.leaseUntil), lte(billingEvent.leaseUntil, now)),
        ),
      ),
    )
    .orderBy(asc(billingEvent.firstReceivedAt))
    .limit(SCHEDULED_WEBHOOK_BATCH_SIZE);

  let processed = 0;
  for (const event of events) {
    const claim = await claimWebhookEvent(db, event.id, now);
    if (!claim) continue;
    try {
      const payload = JSON.parse(event.payloadJson) as unknown;
      if (
        await dispatchClaimedWebhookEvent(db, event.provider, payload, event.id, claim, now, false)
      ) {
        processed += 1;
      }
    } catch (error) {
      await releaseWebhookEventClaim(db, event.id, claim, error, now);
    }
  }
  return processed;
}
