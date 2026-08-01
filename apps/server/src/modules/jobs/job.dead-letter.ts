import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { Database } from "@/db";
import { failedJobEvent, job } from "@/db/schema/jobs";
import type { JobQueueMessage } from "./job.types";

function isJobQueueMessage(value: unknown): value is JobQueueMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "jobId" in value &&
    typeof value.jobId === "string" &&
    value.jobId.length > 0
  );
}

/** Persists every message that Cloudflare moves from the main queue into the DLQ. */
export async function consumeDeadLetterMessages(db: Database, batch: MessageBatch<unknown>) {
  for (const message of batch.messages) {
    if (!isJobQueueMessage(message.body)) {
      console.error("Ignoring invalid dead-letter job queue message");
      message.ack();
      continue;
    }
    try {
      const [failedJob] = await db
        .select()
        .from(job)
        .where(eq(job.id, message.body.jobId))
        .limit(1);
      const now = new Date();
      await db
        .insert(failedJobEvent)
        .values({
          id: crypto.randomUUID(),
          queueMessageId: message.id,
          jobId: message.body.jobId,
          jobType: failedJob?.type ?? "unknown",
          payload: failedJob?.payload ?? { jobId: message.body.jobId },
          error: failedJob?.error ?? "Job was unavailable when the DLQ message arrived",
          attempts: failedJob?.attemptCount ?? message.attempts,
          failedAt: failedJob?.completedAt ?? now,
          resolvedAt: null,
          resolvedBy: null,
          resolution: null,
        })
        .onConflictDoNothing({ target: failedJobEvent.queueMessageId });
      message.ack();
    } catch (error) {
      console.error("Failed to persist dead-letter job event", {
        jobId: message.body.jobId,
        error,
      });
      message.retry({ delaySeconds: 60 });
    }
  }
}

export async function listFailedJobEvents(db: Database, input: { limit: number; offset: number }) {
  return db
    .select()
    .from(failedJobEvent)
    .where(isNull(failedJobEvent.resolvedAt))
    .orderBy(desc(failedJobEvent.failedAt))
    .limit(input.limit)
    .offset(input.offset);
}

export async function countFailedJobEvents(db: Database) {
  const [row] = await db
    .select({ count: count() })
    .from(failedJobEvent)
    .where(isNull(failedJobEvent.resolvedAt));
  return row?.count ?? 0;
}

export async function resolveFailedJobEvent(
  db: Database,
  input: {
    id: string;
    resolvedBy: string;
    resolution: "retried" | "ignored" | "refunded";
  },
) {
  const result = await db
    .update(failedJobEvent)
    .set({ resolvedAt: new Date(), resolvedBy: input.resolvedBy, resolution: input.resolution })
    .where(and(eq(failedJobEvent.id, input.id), isNull(failedJobEvent.resolvedAt)))
    .returning({ id: failedJobEvent.id, jobId: failedJobEvent.jobId });
  return result[0] ?? null;
}
