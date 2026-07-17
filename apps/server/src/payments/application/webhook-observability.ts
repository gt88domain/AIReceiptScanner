import { and, asc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { billingEvent } from "@/db/schema/payments";
import { getEmailProvider } from "@/emails";
import { parseAdminEmails } from "@/lib/admin";

const PENDING_WEBHOOK_ALERT_AFTER_MS = 15 * 60 * 1000;
const PENDING_WEBHOOK_ALERT_MIN_ATTEMPTS = 2;
const MAX_ERROR_LENGTH = 500;

type PendingWebhookAlert = {
  id: string;
  provider: string;
  eventType: string;
  firstReceivedAt: Date | null;
  lastAttemptAt: Date | null;
  attemptCount: number;
  lastError: string | null;
};

type SendPendingWebhookAlert = (alert: PendingWebhookAlert) => Promise<void>;

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown webhook processing error";
  return message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:sk|pk|whsec|re)_[A-Za-z0-9_-]+\b/g, "[secret]")
    .replace(/\s+/g, " ")
    .slice(0, MAX_ERROR_LENGTH);
}

export async function recordWebhookAttempt(db: Database, eventId: string, now = new Date()) {
  await db
    .update(billingEvent)
    .set({
      attemptCount: sql`${billingEvent.attemptCount} + 1`,
      lastAttemptAt: now,
      lastError: null,
    })
    .where(eq(billingEvent.id, eventId));
}

export async function recordWebhookFailure(db: Database, eventId: string, error: unknown) {
  await db
    .update(billingEvent)
    .set({ lastError: sanitizeError(error) })
    .where(eq(billingEvent.id, eventId));
}

async function sendPendingWebhookAlert(recipients: readonly string[], alert: PendingWebhookAlert) {
  await getEmailProvider().send({
    to: [...recipients],
    subject: `[Action required] Pending ${alert.provider} webhook`,
    text: [
      "A payment-provider webhook is still pending.",
      `Provider: ${alert.provider}`,
      `Event: ${alert.eventType}`,
      `Attempts: ${alert.attemptCount}`,
      `First received: ${alert.firstReceivedAt?.toISOString() ?? "unknown"}`,
      `Last attempted: ${alert.lastAttemptAt?.toISOString() ?? "unknown"}`,
      `Last error: ${alert.lastError ?? "unknown"}`,
      "Review it in the read-only administrator dashboard and replay it from the payment provider if needed.",
    ].join("\n"),
  });
}

/**
 * Sends one operational alert per pending event. It deliberately does not replay
 * payment events: only the provider remains the source of retry and payment truth.
 */
export async function alertPendingWebhookEvents(
  db: Database,
  adminEmails: string | undefined,
  {
    now = new Date(),
    send = (alert: PendingWebhookAlert) =>
      sendPendingWebhookAlert([...parseAdminEmails(adminEmails)], alert),
  }: { now?: Date; send?: SendPendingWebhookAlert } = {},
) {
  const recipients = parseAdminEmails(adminEmails);
  if (recipients.size === 0) return 0;

  const threshold = new Date(now.getTime() - PENDING_WEBHOOK_ALERT_AFTER_MS);
  const pending = await db
    .select({
      id: billingEvent.id,
      provider: billingEvent.provider,
      eventType: billingEvent.eventType,
      firstReceivedAt: billingEvent.firstReceivedAt,
      lastAttemptAt: billingEvent.lastAttemptAt,
      attemptCount: billingEvent.attemptCount,
      lastError: billingEvent.lastError,
    })
    .from(billingEvent)
    .where(
      and(
        eq(billingEvent.processingStatus, "pending"),
        isNull(billingEvent.alertedAt),
        lte(billingEvent.firstReceivedAt, threshold),
        gte(billingEvent.attemptCount, PENDING_WEBHOOK_ALERT_MIN_ATTEMPTS),
      ),
    )
    .orderBy(asc(billingEvent.firstReceivedAt))
    .limit(20);

  let alerted = 0;
  for (const event of pending) {
    try {
      await send(event);
      await db
        .update(billingEvent)
        .set({ alertedAt: now })
        .where(and(eq(billingEvent.id, event.id), isNull(billingEvent.alertedAt)));
      alerted += 1;
    } catch (error) {
      console.error("Failed to send pending webhook alert", {
        eventId: event.id,
        error: sanitizeError(error),
      });
    }
  }
  return alerted;
}
