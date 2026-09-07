import { and, count, desc, eq, isNull, lte, notExists, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { failedJobEvent, job, jobEvent, jobOutbox } from "@/db/schema/jobs";
import { logSafeError } from "@/lib/safe-error";
import { currentJobDelivery, isJobQueueMessage } from "./job.delivery";
import { JOB_LEASE_MS } from "./job.worker";

/** Persists every message that Cloudflare moves from the main queue into the DLQ. */
export async function consumeDeadLetterMessages(db: Database, batch: MessageBatch<unknown>) {
  for (const message of batch.messages) {
    if (!isJobQueueMessage(message.body)) {
      console.error("Ignoring invalid dead-letter job queue message");
      message.ack();
      continue;
    }
    try {
      const now = new Date();
      const [recorded] = await db
        .select({ id: failedJobEvent.id })
        .from(failedJobEvent)
        .where(eq(failedJobEvent.queueMessageId, message.id))
        .limit(1);
      if (recorded) {
        message.ack();
        continue;
      }
      const delivery = currentJobDelivery(db, message.body);
      const [failedJob] = await db
        .select()
        .from(job)
        .where(eq(job.id, message.body.jobId))
        .limit(1);

      if (!failedJob) {
        // Preserve diagnostics for removed jobs without changing any live job state.
        await db
          .insert(failedJobEvent)
          .values({
            id: crypto.randomUUID(),
            queueMessageId: message.id,
            jobId: message.body.jobId,
            jobType: "unknown",
            payload: { jobId: message.body.jobId },
            error: "Job was unavailable when the DLQ message arrived",
            attempts: message.attempts,
            failedAt: now,
          })
          .onConflictDoNothing({ target: failedJobEvent.queueMessageId });
        message.ack();
        continue;
      }
      const [current] = await db
        .select({ id: job.id })
        .from(job)
        .where(and(eq(job.id, failedJob.id), delivery))
        .limit(1);
      if (!current || failedJob.status === "succeeded" || failedJob.status === "cancelled") {
        message.ack();
        continue;
      }
      if (failedJob.status === "pending" && failedJob.runAfter > now) {
        await db
          .update(jobOutbox)
          .set({
            status: "pending",
            leaseToken: null,
            leaseUntil: null,
            publishedAt: null,
            updatedAt: now,
          })
          .where(and(eq(jobOutbox.jobId, failedJob.id), delivery));
        message.ack();
        continue;
      }

      if (
        failedJob?.status === "running" &&
        failedJob.leaseUntil &&
        failedJob.leaseUntil.getTime() > now.getTime()
      ) {
        message.retry({
          delaySeconds: Math.max(
            1,
            Math.ceil((failedJob.leaseUntil.getTime() - now.getTime()) / 1000),
          ),
        });
        continue;
      }
      if (
        failedJob?.status === "running" &&
        !failedJob.leaseToken &&
        failedJob.lockedAt &&
        failedJob.lockedAt.getTime() + JOB_LEASE_MS > now.getTime()
      ) {
        message.retry({
          delaySeconds: Math.max(
            1,
            Math.ceil((failedJob.lockedAt.getTime() + JOB_LEASE_MS - now.getTime()) / 1000),
          ),
        });
        continue;
      }

      const notRecorded = notExists(
        db
          .select({ id: failedJobEvent.id })
          .from(failedJobEvent)
          .where(eq(failedJobEvent.queueMessageId, message.id)),
      );
      // Terminalization, operational history and the incident are one transaction.
      // Both writes recheck generation, so an administrator's retry cannot be crossed.
      const [, , incident] = await db.batch([
        db
          .update(job)
          .set({
            status: "failed",
            error: failedJob.error ?? "Queue delivery budget exhausted",
            lockedAt: null,
            leaseToken: null,
            leaseUntil: null,
            completedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(job.id, failedJob.id),
              delivery,
              notRecorded,
              or(
                and(eq(job.status, "pending"), lte(job.runAfter, now)),
                and(
                  eq(job.status, "running"),
                  or(
                    and(
                      isNull(job.leaseUntil),
                      or(
                        isNull(job.lockedAt),
                        lte(job.lockedAt, new Date(now.getTime() - JOB_LEASE_MS)),
                      ),
                    ),
                    lte(job.leaseUntil, now),
                  ),
                ),
              ),
            ),
          ),
        db.insert(jobEvent).select(
          db
            .select({
              id: sql<string>`${crypto.randomUUID()}`.as("id"),
              jobId: sql<string>`${failedJob.id}`.as("job_id"),
              type: sql`'failed'`.as("type"),
              detail: sql`${failedJob.error ?? "Queue delivery budget exhausted"}`.as("detail"),
              createdAt: sql<number>`${Math.floor(now.getTime() / 1000)}`.as("created_at"),
            })
            .from(job)
            .where(and(eq(job.id, failedJob.id), sql`changes() = 1`)),
        ),
        db
          .insert(failedJobEvent)
          .select(
            db
              .select({
                id: sql<string>`${crypto.randomUUID()}`.as("id"),
                queueMessageId: sql<string>`${message.id}`.as("queue_message_id"),
                jobId: job.id,
                jobType: job.type,
                payload: job.payload,
                error: sql<string>`coalesce(${job.error}, 'Queue delivery budget exhausted')`.as("error"),
                attempts: job.attemptCount,
                failedAt: sql<number>`coalesce(${job.completedAt}, ${Math.floor(now.getTime() / 1000)})`.as("failed_at"),
                resolvedAt: sql`null`.as("resolved_at"),
                resolvedBy: sql`null`.as("resolved_by"),
                resolution: sql`null`.as("resolution"),
                resolutionToken: sql`null`.as("resolution_token"),
              })
              .from(job)
              .where(and(eq(job.id, failedJob.id), eq(job.status, "failed"), delivery)),
          )
          .onConflictDoNothing({ target: failedJobEvent.queueMessageId }),
      ]);
      if (incident.meta.changes !== 1) {
        const [stillPending] = await db
          .select({ id: job.id })
          .from(job)
          .where(
            and(
              eq(job.id, failedJob.id),
              delivery,
              or(eq(job.status, "running"), eq(job.status, "pending")),
            ),
          )
          .limit(1);
        if (stillPending) {
          message.retry({ delaySeconds: 60 });
          continue;
        }
      }
      message.ack();
    } catch (error) {
      logSafeError("Failed to persist dead-letter job event", error, {
        jobId: message.body.jobId,
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
    .where(
      and(
        eq(failedJobEvent.id, input.id),
        isNull(failedJobEvent.resolvedAt),
        isNull(failedJobEvent.resolutionToken),
      ),
    )
    .returning({ id: failedJobEvent.id, jobId: failedJobEvent.jobId });
  return result[0] ?? null;
}
