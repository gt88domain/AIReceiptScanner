import { and, eq, exists, notLike } from "drizzle-orm";
import type { Database } from "@/db";
import { jobOutbox } from "@/db/schema/jobs";
import type { JobQueueMessage } from "./job.types";

export const JOB_RETRY_GENERATION_PREFIX = "retry:";

export function isJobQueueMessage(value: unknown): value is JobQueueMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "jobId" in value &&
    typeof value.jobId === "string" &&
    value.jobId.length > 0 &&
    (!("outboxId" in value) ||
      (typeof value.outboxId === "string" && value.outboxId.length > 0))
  );
}

/** The outbox primary key is the delivery generation; retry rotates it atomically. */
export function currentJobDelivery(db: Database, message: JobQueueMessage) {
  return exists(
    db
      .select({ id: jobOutbox.id })
      .from(jobOutbox)
      .where(
        and(
          eq(jobOutbox.jobId, message.jobId),
          message.outboxId
            ? eq(jobOutbox.id, message.outboxId)
            : notLike(jobOutbox.id, `${JOB_RETRY_GENERATION_PREFIX}%`),
        ),
      ),
  );
}
