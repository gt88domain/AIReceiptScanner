import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { job } from "@/db/schema/jobs";
import { createLeaseToken, leaseUntil } from "@/lib/lease";
import { logSafeError, redactErrorText } from "@/lib/safe-error";
import { recordJobEvent } from "./job.events";
import type { JobHandlers, JobQueueMessage } from "./job.types";
import { getRetryDelaySeconds } from "./job.retry";

const JOB_LEASE_MS = 15 * 60 * 1000;
const MAX_QUEUE_DELAY_SECONDS = 24 * 60 * 60;

export async function consumeJobMessages(
  db: Database,
  batch: MessageBatch<unknown>,
  handlers: JobHandlers,
) {
  for (const message of batch.messages) {
    if (!isJobQueueMessage(message.body)) {
      console.error("Ignoring invalid job queue message");
      message.ack();
      continue;
    }
    try {
      const retryDelay = await processJobMessage(db, message.body, handlers);
      if (retryDelay === null) {
        message.ack();
      } else {
        message.retry({ delaySeconds: retryDelay });
      }
    } catch (error) {
      logSafeError("Job message processing failed", error, { jobId: message.body.jobId });
      message.retry({ delaySeconds: 60 });
    }
  }
}

function isJobQueueMessage(value: unknown): value is JobQueueMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "jobId" in value &&
    typeof value.jobId === "string" &&
    value.jobId.length > 0
  );
}

export async function processJobMessage(
  db: Database,
  message: JobQueueMessage,
  handlers: JobHandlers,
  now = new Date(),
) {
  const [existing] = await db.select().from(job).where(eq(job.id, message.jobId)).limit(1);
  if (!existing || existing.status === "succeeded" || existing.status === "cancelled") {
    return null;
  }

  // A terminal failure remains unacknowledged so Cloudflare moves its message to the DLQ.
  if (existing.status === "failed") return getRetryDelaySeconds(existing.attemptCount || 1);

  if (existing.status === "pending" && existing.runAfter > now) {
    return Math.min(
      Math.max(1, Math.ceil((existing.runAfter.getTime() - now.getTime()) / 1000)),
      MAX_QUEUE_DELAY_SECONDS,
    );
  }
  const legacyLeaseExpiredAt = new Date(now.getTime() - JOB_LEASE_MS);
  if (existing.status === "running" && existing.leaseUntil && existing.leaseUntil > now) {
    return Math.max(1, Math.ceil((existing.leaseUntil.getTime() - now.getTime()) / 1000));
  }
  if (
    existing.status === "running" &&
    !existing.leaseToken &&
    existing.lockedAt &&
    existing.lockedAt > legacyLeaseExpiredAt
  ) {
    return Math.max(
      1,
      Math.ceil((existing.lockedAt.getTime() - legacyLeaseExpiredAt.getTime()) / 1000),
    );
  }
  const token = createLeaseToken();
  const claim = await db
    .update(job)
    .set({
      status: "running",
      attemptCount: sql`${job.attemptCount} + 1`,
      lockedAt: now,
      leaseToken: token,
      leaseUntil: leaseUntil(now, JOB_LEASE_MS),
      startedAt: existing.startedAt ?? now,
      updatedAt: now,
    })
    .where(
      and(
        eq(job.id, existing.id),
        or(
          eq(job.status, "pending"),
          and(
            eq(job.status, "running"),
            or(
              and(
                isNull(job.leaseToken),
                or(isNull(job.lockedAt), lte(job.lockedAt, legacyLeaseExpiredAt)),
              ),
              and(isNull(job.leaseUntil)),
              lte(job.leaseUntil, now),
            ),
          ),
        ),
      ),
    )
    .returning({ attemptCount: job.attemptCount });
  if (!claim[0]) return null;

  const attempt = claim[0].attemptCount;
  await recordJobEvent(db, { jobId: existing.id, type: "started" });
  const handler = handlers[existing.type];
  if (!handler) {
    await failJob(
      db,
      existing.id,
      token,
      attempt,
      existing.maxAttempts,
      `No handler for job type: ${existing.type}`,
      true,
    );
    return getRetryDelaySeconds(attempt);
  }

  try {
    const result = await handler({
      id: existing.id,
      idempotencyKey: existing.idempotencyKey,
      ownerId: existing.ownerId,
      payload: existing.payload,
    });
    const completedAt = new Date();
    const completion = await db
      .update(job)
      .set({
        status: "succeeded",
        result: result ?? null,
        error: null,
        lockedAt: null,
        leaseToken: null,
        leaseUntil: null,
        completedAt,
        updatedAt: completedAt,
      })
      .where(and(eq(job.id, existing.id), eq(job.status, "running"), eq(job.leaseToken, token)))
      .run();
    // Cancellation wins if it happened while an external handler was finishing.
    if (completion.meta.changes !== 1) return null;
    await recordJobEvent(db, { jobId: existing.id, type: "succeeded" });
    return null;
  } catch (error) {
    return failJob(
      db,
      existing.id,
      token,
      attempt,
      existing.maxAttempts,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function failJob(
  db: Database,
  id: string,
  token: string,
  attempt: number,
  maxAttempts: number,
  error: string,
  forceTerminal = false,
) {
  const now = new Date();
  const terminal = forceTerminal || attempt >= maxAttempts;
  const update = await db
    .update(job)
    .set({
      status: terminal ? "failed" : "pending",
      error: redactErrorText(error),
      lockedAt: null,
      leaseToken: null,
      leaseUntil: null,
      completedAt: terminal ? now : null,
      updatedAt: now,
    })
    .where(and(eq(job.id, id), eq(job.status, "running"), eq(job.leaseToken, token)))
    .run();
  if (update.meta.changes !== 1) return null;
  await recordJobEvent(db, { jobId: id, type: "failed", detail: redactErrorText(error) });
  return getRetryDelaySeconds(attempt);
}
