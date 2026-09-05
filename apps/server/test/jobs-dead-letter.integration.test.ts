import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { failedJobEvent, job, jobOutbox } from "@/db/schema/jobs";
import { consumeDeadLetterMessages } from "@/modules/jobs/job.dead-letter";
import { createJobService } from "@/modules/jobs/job.service";
import { JOB_LEASE_MS } from "@/modules/jobs/job.worker";

function createDeadLetterBatch(jobId: string) {
  let acknowledgements = 0;
  const retryDelays: number[] = [];
  const message = {
    id: crypto.randomUUID(),
    body: { jobId },
    attempts: 4,
    ack: () => acknowledgements++,
    retry: (options?: { delaySeconds?: number }) => retryDelays.push(options?.delaySeconds ?? 0),
  };
  return {
    batch: { messages: [message] } as unknown as MessageBatch<unknown>,
    acknowledgements: () => acknowledgements,
    retryDelays,
  };
}

describe("job dead-letter queue", () => {
  it("terminalizes pending and expired-running jobs so administrators can retry them", async () => {
    const db = createDb(env.DB);
    const now = new Date();
    const sent: unknown[] = [];
    const jobs = createJobService(db, {
      send: async (body: unknown) => {
        sent.push(body);
      },
    } as unknown as Queue<{ jobId: string }>);
    const states = [
      {
        name: "pending",
        status: "pending" as const,
        lockedAt: null,
        leaseToken: null,
        leaseUntil: null,
      },
      {
        name: "expired-running",
        status: "running" as const,
        lockedAt: new Date(now.getTime() - JOB_LEASE_MS),
        leaseToken: "expired-lease",
        leaseUntil: new Date(now.getTime() - 1_000),
      },
    ];

    for (const state of states) {
      const jobId = crypto.randomUUID();
      await db.batch([
        db.insert(job).values({
          id: jobId,
          idempotencyKey: `dlq-terminalize:${state.name}:${jobId}`,
          type: "ai.generate",
          ownerId: null,
          status: state.status,
          payload: { state: state.name },
          payloadHash: `hash-${state.name}`,
          result: null,
          error: null,
          attemptCount: 4,
          maxAttempts: 4,
          runAfter: now,
          lockedAt: state.lockedAt,
          leaseToken: state.leaseToken,
          leaseUntil: state.leaseUntil,
          startedAt: state.status === "running" ? now : null,
          completedAt: null,
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

      const queue = createDeadLetterBatch(jobId);
      await consumeDeadLetterMessages(db, queue.batch);

      const [failed] = await db.select().from(job).where(eq(job.id, jobId));
      const [event] = await db.select().from(failedJobEvent).where(eq(failedJobEvent.jobId, jobId));
      expect(queue.acknowledgements()).toBe(1);
      expect(queue.retryDelays).toEqual([]);
      expect(failed).toMatchObject({
        status: "failed",
        leaseToken: null,
        leaseUntil: null,
        lockedAt: null,
      });
      expect(event).toBeDefined();

      await expect(
        jobs.retryFailed({ failedJobEventId: event!.id, resolvedBy: "admin-1" }),
      ).resolves.toBe(true);
      const [retried] = await db.select().from(job).where(eq(job.id, jobId));
      expect(retried).toMatchObject({ status: "pending", attemptCount: 0, error: null });
    }

    expect(sent).toHaveLength(2);
  });

  it("does not overwrite an active lease, including the legacy lockedAt lease", async () => {
    const db = createDb(env.DB);
    const now = new Date();
    const states = [
      {
        name: "lease-until",
        lockedAt: now,
        leaseToken: "active-lease",
        leaseUntil: new Date(now.getTime() + JOB_LEASE_MS),
      },
      {
        name: "legacy-locked-at",
        lockedAt: now,
        leaseToken: null,
        leaseUntil: null,
      },
    ];

    for (const state of states) {
      const jobId = crypto.randomUUID();
      await db.insert(job).values({
        id: jobId,
        idempotencyKey: `dlq-active-lease:${state.name}:${jobId}`,
        type: "ai.generate",
        ownerId: null,
        status: "running",
        payload: { state: state.name },
        payloadHash: `hash-${state.name}`,
        result: null,
        error: null,
        attemptCount: 1,
        maxAttempts: 4,
        runAfter: now,
        lockedAt: state.lockedAt,
        leaseToken: state.leaseToken,
        leaseUntil: state.leaseUntil,
        startedAt: now,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      const queue = createDeadLetterBatch(jobId);
      await consumeDeadLetterMessages(db, queue.batch);

      const [persisted] = await db.select().from(job).where(eq(job.id, jobId));
      const events = await db.select().from(failedJobEvent).where(eq(failedJobEvent.jobId, jobId));
      expect(queue.acknowledgements()).toBe(0);
      expect(queue.retryDelays).toHaveLength(1);
      expect(queue.retryDelays[0]).toBeGreaterThan(0);
      expect(persisted).toMatchObject({ status: "running", leaseToken: state.leaseToken });
      expect(events).toEqual([]);
    }
  });

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
