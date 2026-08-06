import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { billingEvent } from "@/db/schema/payments";
import type { EmailService } from "@/emails";
import { parseAdminEmails } from "@/lib/admin";
import { createLeaseToken, leaseUntil, type LeaseToken } from "@/lib/lease";
import { logSafeError } from "@/lib/safe-error";

const PENDING_WEBHOOK_ALERT_AFTER_MS = 15 * 60 * 1000;
const PENDING_WEBHOOK_ALERT_MIN_ATTEMPTS = 2;
const MAX_ERROR_LENGTH = 500;
const WEBHOOK_PROCESSING_LEASE_MS = 5 * 60 * 1000;
const MAX_WEBHOOK_ATTEMPTS = 8;
const RETRY_BASE_DELAY_MS = 60 * 1000;
const RETRY_MAX_DELAY_MS = 60 * 60 * 1000;

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
type WebhookClaim = { token: LeaseToken; attemptCount: number };

/** A verified event requiring a human decision must not consume provider retry budget. */
export class NonRetryableWebhookError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export function sanitizePaymentJobError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown webhook processing error";
  return message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:sk|pk|whsec|re)_[A-Za-z0-9_-]+\b/g, "[secret]")
    .replace(/\s+/g, " ")
    .slice(0, MAX_ERROR_LENGTH);
}

function retryAt(now: Date, attemptCount: number) {
  const multiplier = 2 ** Math.max(0, attemptCount - 1);
  return new Date(now.getTime() + Math.min(RETRY_BASE_DELAY_MS * multiplier, RETRY_MAX_DELAY_MS));
}

/** Atomically claims a pending or expired webhook lease for one handler invocation. */
export async function claimWebhookEvent(db: Database, eventId: string, now = new Date()) {
  const token = createLeaseToken();
  const [claimed] = await db
    .update(billingEvent)
    .set({
      processingStatus: "processing",
      leaseToken: token,
      leaseUntil: leaseUntil(now, WEBHOOK_PROCESSING_LEASE_MS),
      nextRetryAt: null,
      attemptCount: sql`${billingEvent.attemptCount} + 1`,
      lastAttemptAt: now,
      lastError: null,
    })
    .where(
      and(
        eq(billingEvent.id, eventId),
        or(
          eq(billingEvent.processingStatus, "pending"),
          and(
            eq(billingEvent.processingStatus, "processing"),
            or(isNull(billingEvent.leaseUntil), lte(billingEvent.leaseUntil, now)),
          ),
        ),
      ),
    )
    .returning({ attemptCount: billingEvent.attemptCount });
  return claimed ? ({ token, attemptCount: claimed.attemptCount } satisfies WebhookClaim) : null;
}

/** Releases a failed claim with bounded exponential backoff, or dead-letters it. */
export async function releaseWebhookEventClaim(
  db: Database,
  eventId: string,
  claim: WebhookClaim,
  error: unknown,
  now = new Date(),
) {
  const exhausted =
    error instanceof NonRetryableWebhookError || claim.attemptCount >= MAX_WEBHOOK_ATTEMPTS;
  await db
    .update(billingEvent)
    .set({
      processingStatus: exhausted ? "dead_letter" : "pending",
      leaseToken: null,
      leaseUntil: null,
      nextRetryAt: exhausted ? null : retryAt(now, claim.attemptCount),
      deadLetteredAt: exhausted ? now : null,
      lastError: sanitizePaymentJobError(error),
    })
    .where(
      and(
        eq(billingEvent.id, eventId),
        eq(billingEvent.processingStatus, "processing"),
        eq(billingEvent.leaseToken, claim.token),
      ),
    );
}

/** Reopens one non-successful event after an administrator fixes its cause. */
export async function replayWebhookEvent(db: Database, eventId: string, now = new Date()) {
  const [replayed] = await db
    .update(billingEvent)
    .set({
      processingStatus: "pending",
      attemptCount: 0,
      lastAttemptAt: null,
      lastError: null,
      leaseToken: null,
      leaseUntil: null,
      nextRetryAt: now,
      alertedAt: null,
      alertLeaseToken: null,
      alertLeaseUntil: null,
      deadLetteredAt: null,
    })
    .where(
      and(
        eq(billingEvent.id, eventId),
        inArray(billingEvent.processingStatus, ["pending", "dead_letter"]),
      ),
    )
    .returning({ id: billingEvent.id });
  return Boolean(replayed);
}

async function claimPendingWebhookAlert(db: Database, eventId: string, now: Date) {
  const token = createLeaseToken();
  const threshold = new Date(now.getTime() - PENDING_WEBHOOK_ALERT_AFTER_MS);
  const [claimed] = await db
    .update(billingEvent)
    .set({
      alertLeaseToken: token,
      alertLeaseUntil: leaseUntil(now, WEBHOOK_PROCESSING_LEASE_MS),
    })
    .where(
      and(
        eq(billingEvent.id, eventId),
        or(
          eq(billingEvent.processingStatus, "dead_letter"),
          and(
            eq(billingEvent.processingStatus, "pending"),
            lte(billingEvent.firstReceivedAt, threshold),
            gte(billingEvent.attemptCount, PENDING_WEBHOOK_ALERT_MIN_ATTEMPTS),
          ),
        ),
        isNull(billingEvent.alertedAt),
        or(isNull(billingEvent.alertLeaseUntil), lte(billingEvent.alertLeaseUntil, now)),
      ),
    )
    .returning({
      id: billingEvent.id,
      provider: billingEvent.provider,
      eventType: billingEvent.eventType,
      firstReceivedAt: billingEvent.firstReceivedAt,
      lastAttemptAt: billingEvent.lastAttemptAt,
      attemptCount: billingEvent.attemptCount,
      lastError: billingEvent.lastError,
    });
  return claimed ? { event: claimed, token } : null;
}

async function sendPendingWebhookAlert(
  email: EmailService,
  recipients: readonly string[],
  alert: PendingWebhookAlert,
) {
  await email.send({
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
      "Review and replay it through the administrator procedure after correcting the failure.",
    ].join("\n"),
  });
}

/**
 * Sends one operational alert per pending or dead-letter event. Automatic retries
 * are bounded; only an administrator may reopen a dead letter.
 */
export async function alertPendingWebhookEvents(
  db: Database,
  adminEmails: string | undefined,
  {
    now = new Date(),
    email,
    send = (alert: PendingWebhookAlert) =>
      email
        ? sendPendingWebhookAlert(email, [...parseAdminEmails(adminEmails)], alert)
        : Promise.resolve(),
  }: { now?: Date; email?: EmailService; send?: SendPendingWebhookAlert } = {},
) {
  const recipients = parseAdminEmails(adminEmails);
  if (recipients.size === 0) return 0;

  const threshold = new Date(now.getTime() - PENDING_WEBHOOK_ALERT_AFTER_MS);
  const pending = await db
    .select({ id: billingEvent.id })
    .from(billingEvent)
    .where(
      and(
        or(
          eq(billingEvent.processingStatus, "dead_letter"),
          and(
            eq(billingEvent.processingStatus, "pending"),
            lte(billingEvent.firstReceivedAt, threshold),
            gte(billingEvent.attemptCount, PENDING_WEBHOOK_ALERT_MIN_ATTEMPTS),
          ),
        ),
        isNull(billingEvent.alertedAt),
      ),
    )
    .orderBy(asc(billingEvent.firstReceivedAt))
    .limit(20);

  let alerted = 0;
  for (const event of pending) {
    const claim = await claimPendingWebhookAlert(db, event.id, now);
    if (!claim) continue;
    try {
      await send(claim.event);
      const [completed] = await db
        .update(billingEvent)
        .set({ alertedAt: now, alertLeaseToken: null, alertLeaseUntil: null })
        .where(
          and(
            eq(billingEvent.id, event.id),
            isNull(billingEvent.alertedAt),
            eq(billingEvent.alertLeaseToken, claim.token),
          ),
        )
        .returning({ id: billingEvent.id });
      if (completed) alerted += 1;
    } catch (error) {
      await db
        .update(billingEvent)
        .set({ alertLeaseToken: null, alertLeaseUntil: null })
        .where(and(eq(billingEvent.id, event.id), eq(billingEvent.alertLeaseToken, claim.token)));
      logSafeError("Failed to send pending webhook alert", error, { eventId: event.id });
    }
  }
  return alerted;
}
