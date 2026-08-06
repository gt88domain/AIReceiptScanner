import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { ServerPaymentProviderKey } from "@repo/app-config";
import type { Database } from "@/db";
import { billingOutbox, billingSubscription } from "@/db/schema/payments";
import { createLeaseToken, leaseUntil, type LeaseToken } from "@/lib/lease";
import type { DbLike } from "@/payments/infrastructure/repositories/billing-store";
import { getPaymentProvider } from "../providers";
import { sanitizePaymentJobError } from "./webhook-observability";

const OUTBOX_LEASE_MS = 5 * 60 * 1000;
const MAX_OUTBOX_ATTEMPTS = 8;
const RETRY_BASE_DELAY_MS = 60 * 1000;
const RETRY_MAX_DELAY_MS = 60 * 60 * 1000;
const OUTBOX_BATCH_SIZE = 20;

type CancelPreviousSubscriptionPayload = {
  subscriptionId: string;
};

type BillingOutboxClaim = { token: LeaseToken; attemptCount: number };

function retryAt(now: Date, attemptCount: number) {
  const multiplier = 2 ** Math.max(0, attemptCount - 1);
  return new Date(now.getTime() + Math.min(RETRY_BASE_DELAY_MS * multiplier, RETRY_MAX_DELAY_MS));
}

export async function enqueueCancelPreviousSubscription(
  db: DbLike,
  input: { provider: ServerPaymentProviderKey; subscriptionId: string },
) {
  const now = new Date();
  const deduplicationKey = `cancel_previous_subscription:${input.provider}:${input.subscriptionId}`;
  await db
    .insert(billingOutbox)
    .values({
      id: crypto.randomUUID(),
      jobType: "cancel_previous_subscription",
      provider: input.provider,
      deduplicationKey,
      payloadJson: JSON.stringify({ subscriptionId: input.subscriptionId }),
      processingStatus: "pending",
      attemptCount: 0,
      nextRetryAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: billingOutbox.deduplicationKey });
}

/** Reopens one non-successful external effect after an administrator fixes its cause. */
export async function replayBillingOutboxJob(db: Database, jobId: string, now = new Date()) {
  const [replayed] = await db
    .update(billingOutbox)
    .set({
      processingStatus: "pending",
      attemptCount: 0,
      lastAttemptAt: null,
      lastError: null,
      leaseToken: null,
      leaseUntil: null,
      nextRetryAt: now,
      deadLetteredAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(billingOutbox.id, jobId),
        inArray(billingOutbox.processingStatus, ["pending", "dead_letter"]),
      ),
    )
    .returning({ id: billingOutbox.id });
  return Boolean(replayed);
}

async function claimBillingOutboxJob(db: Database, jobId: string, now: Date) {
  const token = createLeaseToken();
  const [claimed] = await db
    .update(billingOutbox)
    .set({
      processingStatus: "processing",
      attemptCount: sql`${billingOutbox.attemptCount} + 1`,
      lastAttemptAt: now,
      lastError: null,
      leaseToken: token,
      leaseUntil: leaseUntil(now, OUTBOX_LEASE_MS),
      nextRetryAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(billingOutbox.id, jobId),
        or(
          eq(billingOutbox.processingStatus, "pending"),
          and(
            eq(billingOutbox.processingStatus, "processing"),
            or(isNull(billingOutbox.leaseUntil), lte(billingOutbox.leaseUntil, now)),
          ),
        ),
      ),
    )
    .returning({ attemptCount: billingOutbox.attemptCount });
  return claimed
    ? ({ token, attemptCount: claimed.attemptCount } satisfies BillingOutboxClaim)
    : null;
}

async function releaseBillingOutboxJob(
  db: Database,
  jobId: string,
  claim: BillingOutboxClaim,
  error: unknown,
  now: Date,
) {
  const exhausted = claim.attemptCount >= MAX_OUTBOX_ATTEMPTS;
  await db
    .update(billingOutbox)
    .set({
      processingStatus: exhausted ? "dead_letter" : "pending",
      lastError: sanitizePaymentJobError(error),
      leaseToken: null,
      leaseUntil: null,
      nextRetryAt: exhausted ? null : retryAt(now, claim.attemptCount),
      deadLetteredAt: exhausted ? now : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(billingOutbox.id, jobId),
        eq(billingOutbox.processingStatus, "processing"),
        eq(billingOutbox.leaseToken, claim.token),
      ),
    );
}

async function processBillingOutboxJob(
  db: Database,
  job: typeof billingOutbox.$inferSelect,
  claim: BillingOutboxClaim,
  now: Date,
) {
  if (job.jobType !== "cancel_previous_subscription") return;
  const payload = JSON.parse(job.payloadJson) as CancelPreviousSubscriptionPayload;
  if (!payload.subscriptionId) throw new Error("Invalid cancel_previous_subscription job payload");

  await getPaymentProvider(job.provider).setSubscriptionCancelAtPeriodEnd({
    subscriptionId: payload.subscriptionId,
    cancelAtPeriodEnd: true,
  });
  await db
    .update(billingSubscription)
    .set({ cancelAtPeriodEnd: true, updatedAt: now })
    .where(
      and(
        eq(billingSubscription.provider, job.provider),
        eq(billingSubscription.providerSubscriptionId, payload.subscriptionId),
        sql`exists (
          select 1 from billing_outbox
          where id = ${job.id} and lease_token = ${claim.token}
        )`,
      ),
    );
}

/** Performs due provider side effects outside webhook request handling. */
export async function processBillingOutbox(db: Database, now = new Date()) {
  const jobs = await db
    .select()
    .from(billingOutbox)
    .where(
      or(
        and(
          eq(billingOutbox.processingStatus, "pending"),
          or(isNull(billingOutbox.nextRetryAt), lte(billingOutbox.nextRetryAt, now)),
        ),
        and(
          eq(billingOutbox.processingStatus, "processing"),
          or(isNull(billingOutbox.leaseUntil), lte(billingOutbox.leaseUntil, now)),
        ),
      ),
    )
    .orderBy(asc(billingOutbox.createdAt))
    .limit(OUTBOX_BATCH_SIZE);

  let processed = 0;
  for (const job of jobs) {
    const claim = await claimBillingOutboxJob(db, job.id, now);
    if (!claim) continue;
    try {
      await processBillingOutboxJob(db, job, claim, now);
      const [completed] = await db
        .update(billingOutbox)
        .set({
          processingStatus: "processed",
          leaseToken: null,
          leaseUntil: null,
          nextRetryAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(billingOutbox.id, job.id),
            eq(billingOutbox.processingStatus, "processing"),
            eq(billingOutbox.leaseToken, claim.token),
          ),
        )
        .returning({ id: billingOutbox.id });
      if (completed) processed += 1;
    } catch (error) {
      await releaseBillingOutboxJob(db, job.id, claim, error, now);
    }
  }
  return processed;
}
