import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { failedJobEvent, job, jobOutbox, type Job } from "@/db/schema/jobs";
import { createLeaseToken, leaseUntil } from "@/lib/lease";
import { logSafeError, redactErrorText } from "@/lib/safe-error";
import { recordJobEvent } from "./job.events";
import type { JobQueueMessage, JobType } from "./job.types";

const JOB_OUTBOX_LEASE_MS = 5 * 60 * 1000;
export const MAX_JOB_DELIVERIES = 4;

export type CreateJobInput = {
  idempotencyKey: string;
  type: JobType;
  ownerId?: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
  runAfter?: Date;
};

function stableJson(value: unknown): string {
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Job payload must contain finite numbers.");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new Error("Job payload must contain plain JSON objects.");
    }
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  throw new Error("Job payload must be JSON-serializable.");
}

async function hashJobPayload(payload: Record<string, unknown>) {
  const encoded = new TextEncoder().encode(stableJson(payload));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createJobService(db: Database, queue: Pick<Queue<JobQueueMessage>, "send">) {
  async function create(input: CreateJobInput) {
    const now = new Date();
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey) throw new Error("Job idempotencyKey is required.");
    const payloadHash = await hashJobPayload(input.payload);
    const maxAttempts = input.maxAttempts ?? 3;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_JOB_DELIVERIES) {
      throw new Error(`Job maxAttempts must be an integer from 1 to ${MAX_JOB_DELIVERIES}.`);
    }
    const record: Job = {
      id: crypto.randomUUID(),
      idempotencyKey,
      type: input.type,
      ownerId: input.ownerId ?? null,
      status: "pending",
      payload: input.payload,
      payloadHash,
      result: null,
      error: null,
      attemptCount: 0,
      maxAttempts,
      runAfter: input.runAfter ?? now,
      lockedAt: null,
      leaseToken: null,
      leaseUntil: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const outboxId = crypto.randomUUID();

    try {
      await db.batch([
        db.insert(job).values(record),
        db.insert(jobOutbox).values({
          id: outboxId,
          jobId: record.id,
          status: "pending",
          attempts: 0,
          lastError: null,
          publishedAt: null,
          createdAt: now,
          updatedAt: now,
        }),
      ]);
    } catch (error) {
      const [existing] = await db
        .select()
        .from(job)
        .where(eq(job.idempotencyKey, idempotencyKey))
        .limit(1);
      if (!existing) throw error;
      if (
        existing.type !== input.type ||
        existing.ownerId !== (input.ownerId ?? null) ||
        existing.payloadHash !== payloadHash
      ) {
        throw new Error("Job idempotencyKey was already used with different input.");
      }
      return existing;
    }
    await recordJobEvent(db, { jobId: record.id, type: "queued" });

    try {
      await publishOutboxRecord(outboxId);
    } catch (error) {
      // The durable outbox is retried by the scheduled dispatcher.
      logSafeError("Failed to publish a newly created job", error, { jobId: record.id });
    }
    return record;
  }

  async function publishOutboxRecord(outboxId: string) {
    const now = new Date();
    const token = createLeaseToken();
    const [outbox] = await db
      .update(jobOutbox)
      .set({
        status: "publishing",
        leaseToken: token,
        leaseUntil: leaseUntil(now, JOB_OUTBOX_LEASE_MS),
        attempts: sql`${jobOutbox.attempts} + 1`,
        lastError: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(jobOutbox.id, outboxId),
          or(
            eq(jobOutbox.status, "pending"),
            and(
              eq(jobOutbox.status, "publishing"),
              or(isNull(jobOutbox.leaseUntil), lte(jobOutbox.leaseUntil, now)),
            ),
          ),
        ),
      )
      .returning({ id: jobOutbox.id, jobId: jobOutbox.jobId });
    if (!outbox) return;

    try {
      await queue.send({ jobId: outbox.jobId }, { contentType: "json" });
      await db
        .update(jobOutbox)
        .set({
          status: "published",
          leaseToken: null,
          leaseUntil: null,
          publishedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(jobOutbox.id, outbox.id),
            eq(jobOutbox.status, "publishing"),
            eq(jobOutbox.leaseToken, token),
          ),
        );
    } catch (error) {
      await db
        .update(jobOutbox)
        .set({
          status: "pending",
          leaseToken: null,
          leaseUntil: null,
          lastError: redactErrorText(error instanceof Error ? error.message : String(error)),
          updatedAt: now,
        })
        .where(
          and(
            eq(jobOutbox.id, outbox.id),
            eq(jobOutbox.status, "publishing"),
            eq(jobOutbox.leaseToken, token),
          ),
        );
      throw error;
    }
  }

  async function flushOutbox(limit = 25) {
    const pending = await db
      .select({ id: jobOutbox.id })
      .from(jobOutbox)
      .where(
        or(
          eq(jobOutbox.status, "pending"),
          and(
            eq(jobOutbox.status, "publishing"),
            or(isNull(jobOutbox.leaseUntil), lte(jobOutbox.leaseUntil, new Date())),
          ),
        ),
      )
      .orderBy(asc(jobOutbox.createdAt))
      .limit(limit);

    for (const outbox of pending) {
      try {
        await publishOutboxRecord(outbox.id);
      } catch (error) {
        logSafeError("Failed to publish job outbox record", error, { outboxId: outbox.id });
      }
    }
  }

  async function cancel(id: string) {
    const now = new Date();
    const result = await db
      .update(job)
      .set({
        status: "cancelled",
        lockedAt: null,
        leaseToken: null,
        leaseUntil: null,
        completedAt: now,
        updatedAt: now,
      })
      .where(and(eq(job.id, id), inArray(job.status, ["pending", "running"])))
      .returning({ id: job.id, status: job.status });
    if (result[0]?.status === "cancelled") {
      await recordJobEvent(db, { jobId: id, type: "cancelled" });
      return true;
    }
    return false;
  }

  async function retryFailed(input: { failedJobEventId: string; resolvedBy: string }) {
    const [event] = await db
      .select({ id: failedJobEvent.id, jobId: failedJobEvent.jobId })
      .from(failedJobEvent)
      .where(eq(failedJobEvent.id, input.failedJobEventId))
      .limit(1);
    if (!event) return false;

    const now = new Date();
    const resolutionToken = createLeaseToken();
    const retryableState = sql`exists (
      select 1 from job where id = ${event.jobId} and status = 'failed'
    ) and exists (
      select 1 from job_outbox where job_id = ${event.jobId}
    )`;
    const eventIsClaimed = sql`exists (
      select 1 from failed_job_event
      where id = ${event.id} and resolution_token = ${resolutionToken}
    )`;
    const updates = await db.batch([
      db
        .update(failedJobEvent)
        .set({ resolutionToken })
        .where(
          and(
            eq(failedJobEvent.id, event.id),
            isNull(failedJobEvent.resolvedAt),
            isNull(failedJobEvent.resolutionToken),
            retryableState,
          ),
        ),
      db
        .update(job)
        .set({
          status: "pending",
          error: null,
          attemptCount: 0,
          runAfter: now,
          lockedAt: null,
          leaseToken: null,
          leaseUntil: null,
          startedAt: null,
          completedAt: null,
          updatedAt: now,
        })
        .where(and(eq(job.id, event.jobId), eq(job.status, "failed"), eventIsClaimed)),
      db
        .update(jobOutbox)
        .set({
          status: "pending",
          leaseToken: null,
          leaseUntil: null,
          lastError: null,
          publishedAt: null,
          updatedAt: now,
        })
        .where(and(eq(jobOutbox.jobId, event.jobId), eventIsClaimed)),
      db
        .update(failedJobEvent)
        .set({
          resolvedAt: now,
          resolvedBy: input.resolvedBy,
          resolution: "retried",
          resolutionToken: null,
        })
        .where(
          and(eq(failedJobEvent.id, event.id), eq(failedJobEvent.resolutionToken, resolutionToken)),
        ),
    ]);
    if (
      updates[0].meta.changes !== 1 ||
      updates[1].meta.changes !== 1 ||
      updates[2].meta.changes !== 1 ||
      updates[3].meta.changes !== 1
    ) {
      return false;
    }
    await recordJobEvent(db, { jobId: event.jobId, type: "queued", detail: "retried from DLQ" });
    await publishOutboxRecordForJob(event.jobId);
    return true;
  }

  async function publishOutboxRecordForJob(jobId: string) {
    const [outbox] = await db.select().from(jobOutbox).where(eq(jobOutbox.jobId, jobId)).limit(1);
    if (outbox) await publishOutboxRecord(outbox.id);
  }

  return { cancel, create, flushOutbox, retryFailed };
}
