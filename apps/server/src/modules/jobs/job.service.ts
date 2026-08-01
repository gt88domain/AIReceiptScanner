import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db";
import { failedJobEvent, job, jobOutbox, type Job } from "@/db/schema/jobs";
import { resolveFailedJobEvent } from "./job.dead-letter";
import { recordJobEvent } from "./job.events";
import type { JobQueueMessage, JobType } from "./job.types";

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
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new Error("Job maxAttempts must be a positive integer.");
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
      console.error("Failed to publish a newly created job", { jobId: record.id, error });
    }
    return record;
  }

  async function publishOutboxRecord(outboxId: string) {
    const [outbox] = await db.select().from(jobOutbox).where(eq(jobOutbox.id, outboxId)).limit(1);
    if (!outbox || outbox.status === "published") return;

    const now = new Date();
    try {
      await queue.send({ jobId: outbox.jobId }, { contentType: "json" });
      await db
        .update(jobOutbox)
        .set({
          status: "published",
          attempts: outbox.attempts + 1,
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(jobOutbox.id, outbox.id));
    } catch (error) {
      await db
        .update(jobOutbox)
        .set({
          attempts: outbox.attempts + 1,
          lastError: error instanceof Error ? error.message : String(error),
          updatedAt: now,
        })
        .where(eq(jobOutbox.id, outbox.id));
      throw error;
    }
  }

  async function flushOutbox(limit = 25) {
    const pending = await db
      .select({ id: jobOutbox.id })
      .from(jobOutbox)
      .where(eq(jobOutbox.status, "pending"))
      .orderBy(asc(jobOutbox.createdAt))
      .limit(limit);

    for (const outbox of pending) {
      try {
        await publishOutboxRecord(outbox.id);
      } catch (error) {
        console.error("Failed to publish job outbox record", { outboxId: outbox.id, error });
      }
    }
  }

  async function cancel(id: string) {
    const now = new Date();
    const result = await db
      .update(job)
      .set({ status: "cancelled", completedAt: now, updatedAt: now })
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
    const updates = await db.batch([
      db
        .update(job)
        .set({
          status: "pending",
          error: null,
          attemptCount: 0,
          runAfter: now,
          lockedAt: null,
          startedAt: null,
          completedAt: null,
          updatedAt: now,
        })
        .where(and(eq(job.id, event.jobId), eq(job.status, "failed"))),
      db
        .update(jobOutbox)
        .set({ status: "pending", lastError: null, publishedAt: null, updatedAt: now })
        .where(eq(jobOutbox.jobId, event.jobId)),
    ]);
    if (updates[0].meta.changes !== 1) return false;

    const resolved = await resolveFailedJobEvent(db, {
      id: event.id,
      resolvedBy: input.resolvedBy,
      resolution: "retried",
    });
    if (!resolved) return false;
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
