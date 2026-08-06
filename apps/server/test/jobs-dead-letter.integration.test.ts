import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { failedJobEvent, job, jobOutbox } from "@/db/schema/jobs";
import { consumeDeadLetterMessages } from "@/modules/jobs/job.dead-letter";
import { createJobService } from "@/modules/jobs/job.service";

describe("job dead-letter queue", () => {
  it("persists one failure event and lets an admin requeue the failed job", async () => {
    const db = createDb(env.DB);
    const now = new Date();
    const jobId = crypto.randomUUID();
    await db.batch([
      db.insert(job).values({
        id: jobId,
        idempotencyKey: `dead-letter:${jobId}`,
        type: "ai.generate",
        ownerId: null,
        status: "failed",
        payload: { prompt: "generate a chapter" },
        payloadHash: "test-payload-hash",
        result: null,
        error: "provider timeout",
        attemptCount: 3,
        maxAttempts: 3,
        runAfter: now,
        lockedAt: null,
        startedAt: now,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(jobOutbox).values({
        id: crypto.randomUUID(),
        jobId,
        status: "published",
        attempts: 1,
        lastError: null,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    let acknowledged = 0;
    const message = {
      id: crypto.randomUUID(),
      body: { jobId },
      attempts: 3,
      ack: () => acknowledged++,
      retry: () => undefined,
    };
    const batch = { messages: [message] } as unknown as MessageBatch<unknown>;
    await consumeDeadLetterMessages(db, batch);
    await consumeDeadLetterMessages(db, batch);

    const events = await db.select().from(failedJobEvent).where(eq(failedJobEvent.jobId, jobId));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      jobType: "ai.generate",
      error: "provider timeout",
      attempts: 3,
    });
    expect(acknowledged).toBe(2);

    const sent: unknown[] = [];
    const jobs = createJobService(db, {
      send: async (body: unknown) => {
        sent.push(body);
      },
    } as unknown as Queue<{ jobId: string }>);
    const retries = await Promise.all([
      jobs.retryFailed({ failedJobEventId: events[0]!.id, resolvedBy: "admin-1" }),
      jobs.retryFailed({ failedJobEventId: events[0]!.id, resolvedBy: "admin-2" }),
    ]);
    expect(retries.filter(Boolean)).toHaveLength(1);

    const [retriedJob] = await db.select().from(job).where(eq(job.id, jobId));
    const [resolvedEvent] = await db
      .select()
      .from(failedJobEvent)
      .where(eq(failedJobEvent.id, events[0]!.id));
    expect(retriedJob).toMatchObject({ status: "pending", attemptCount: 0, error: null });
    expect(resolvedEvent).toMatchObject({ resolution: "retried", resolvedBy: "admin-1" });
    expect(sent).toEqual([{ jobId }]);
  });

  it("does not resolve a DLQ event when its durable job state is missing", async () => {
    const db = createDb(env.DB);
    const now = new Date();
    const jobId = crypto.randomUUID();
    await db.insert(job).values({
      id: jobId,
      idempotencyKey: `missing-outbox:${jobId}`,
      type: "ai.generate",
      ownerId: null,
      status: "failed",
      payload: {},
      payloadHash: "hash",
      result: null,
      error: "failed",
      attemptCount: 3,
      maxAttempts: 3,
      runAfter: now,
      lockedAt: null,
      leaseToken: null,
      leaseUntil: null,
      startedAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const eventId = crypto.randomUUID();
    await db.insert(failedJobEvent).values({
      id: eventId,
      queueMessageId: crypto.randomUUID(),
      jobId,
      jobType: "ai.generate",
      payload: {},
      error: "failed",
      attempts: 3,
      failedAt: now,
      resolvedAt: null,
      resolvedBy: null,
      resolution: null,
      resolutionToken: null,
    });
    const jobs = createJobService(db, { send: async () => undefined } as unknown as Queue<{
      jobId: string;
    }>);

    await expect(
      jobs.retryFailed({ failedJobEventId: eventId, resolvedBy: "admin-1" }),
    ).resolves.toBe(false);

    const [event] = await db.select().from(failedJobEvent).where(eq(failedJobEvent.id, eventId));
    expect(event).toMatchObject({ resolvedAt: null, resolution: null, resolutionToken: null });
  });
});
