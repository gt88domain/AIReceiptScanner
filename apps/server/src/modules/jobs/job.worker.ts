import { and, eq, lt, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { job } from "@/db/schema/jobs";
import { recordJobEvent } from "./job.events";
import type { JobHandlers, JobQueueMessage } from "./job.schema";
import { getRetryDelaySeconds } from "./job.retry";

const JOB_LEASE_MS = 15 * 60 * 1000;
const MAX_QUEUE_DELAY_SECONDS = 12 * 60 * 60;

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
      console.error("Job message processing failed", { jobId: message.body.jobId, error });
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

async function processJobMessage(db: Database, message: JobQueueMessage, handlers: JobHandlers) {
  const [existing] = await db.select().from(job).where(eq(job.id, message.jobId)).limit(1);
  if (
    !existing ||
    existing.status === "succeeded" ||
    existing.status === "failed" ||
    existing.status === "cancelled"
  ) {
    return null;
  }

  const now = new Date();
  if (existing.runAfter > now) {
    return Math.min(
      Math.max(1, Math.ceil((existing.runAfter.getTime() - now.getTime()) / 1000)),
      MAX_QUEUE_DELAY_SECONDS,
    );
  }
  const leaseExpiredAt = new Date(now.getTime() - JOB_LEASE_MS);
  if (existing.status === "running" && existing.lockedAt && existing.lockedAt > leaseExpiredAt) {
    return Math.max(1, Math.ceil((existing.lockedAt.getTime() - leaseExpiredAt.getTime()) / 1000));
  }
  const claim = await db
    .update(job)
    .set({
      status: "running",
      attemptCount: sql`${job.attemptCount} + 1`,
      lockedAt: now,
      startedAt: existing.startedAt ?? now,
      updatedAt: now,
    })
    .where(
      and(
        eq(job.id, existing.id),
        or(
          eq(job.status, "pending"),
          and(eq(job.status, "running"), lt(job.lockedAt, leaseExpiredAt)),
        ),
      ),
    )
    .run();
  if (claim.meta.changes !== 1) return null;

  const attempt = existing.attemptCount + 1;
  await recordJobEvent(db, { jobId: existing.id, type: "started" });
  const handler = handlers[existing.type];
  if (!handler) {
    await failJob(
      db,
      existing.id,
      attempt,
      existing.maxAttempts,
      `No handler for job type: ${existing.type}`,
      true,
    );
    return null;
  }

  try {
    const result = await handler({
      id: existing.id,
      ownerId: existing.ownerId,
      payload: existing.payload,
    });
    const completedAt = new Date();
    await db
      .update(job)
      .set({
        status: "succeeded",
        result: result ?? null,
        error: null,
        lockedAt: null,
        completedAt,
        updatedAt: completedAt,
      })
      .where(eq(job.id, existing.id));
    await recordJobEvent(db, { jobId: existing.id, type: "succeeded" });
    return null;
  } catch (error) {
    return failJob(
      db,
      existing.id,
      attempt,
      existing.maxAttempts,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function failJob(
  db: Database,
  id: string,
  attempt: number,
  maxAttempts: number,
  error: string,
  forceTerminal = false,
) {
  const now = new Date();
  const terminal = forceTerminal || attempt >= maxAttempts;
  await db
    .update(job)
    .set({
      status: terminal ? "failed" : "pending",
      error,
      lockedAt: null,
      completedAt: terminal ? now : null,
      updatedAt: now,
    })
    .where(eq(job.id, id));
  await recordJobEvent(db, { jobId: id, type: "failed", detail: error });
  return terminal ? null : getRetryDelaySeconds(attempt);
}
