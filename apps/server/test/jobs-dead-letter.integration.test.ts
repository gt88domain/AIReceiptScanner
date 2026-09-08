import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { adminAuditLog } from "@/db/schema/audit";
import { failedJobEvent, job, jobEvent, jobOutbox } from "@/db/schema/jobs";
import { consumeDeadLetterMessages } from "@/modules/jobs/job.dead-letter";
import { createJobService } from "@/modules/jobs/job.service";
import { JOB_LEASE_MS, processJobMessage } from "@/modules/jobs/job.worker";

function sentToQueue(): QueueSendResponse {
  return { metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } } };
}

function createDeadLetterBatch(jobId: string, outboxId?: string) {
  let acknowledgements = 0;
  const retryDelays: number[] = [];
  const message = {
    id: crypto.randomUUID(),
    body: { jobId, ...(outboxId ? { outboxId } : {}) },
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
  it("keeps future jobs out of Queue and parks early main/DLQ deliveries until due", async () => {
    const db = createDb(env.DB);
    const sent: unknown[] = [];
    const jobs = createJobService(db, {
      send: async (body) => {
        sent.push(body);
        return sentToQueue();
      },
    });
    const future = await jobs.create({
      idempotencyKey: `future:${crypto.randomUUID()}`,
      type: "ai.generate",
      payload: {},
      runAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const [outbox] = await db.select().from(jobOutbox).where(eq(jobOutbox.jobId, future.id));
    expect(sent).toEqual([]);
    let calls = 0;
    await expect(
      processJobMessage(
        db,
        { jobId: future.id, outboxId: outbox!.id },
        {
          "ai.generate": async () => {
            calls++;
          },
        },
      ),
    ).resolves.toBeNull();
    const early = createDeadLetterBatch(future.id, outbox!.id);
    await consumeDeadLetterMessages(db, early.batch);
    expect(early.acknowledgements()).toBe(1);
    expect(early.retryDelays).toEqual([]);
    expect(calls).toBe(0);
    const [pending] = await db.select().from(job).where(eq(job.id, future.id));
    expect(pending).toMatchObject({ status: "pending", attemptCount: 0 });
    expect(
      await db.select().from(failedJobEvent).where(eq(failedJobEvent.jobId, future.id)),
    ).toEqual([]);

    // An earlier future outbox must not occupy the dispatcher's bounded due-job slice.
    const due = await jobs.create({
      idempotencyKey: `due:${crypto.randomUUID()}`,
      type: "ai.generate",
      payload: {},
      runAfter: new Date(Date.now() + 60_000),
    });
    await db
      .update(job)
      .set({ runAfter: new Date(Date.now() - 1_000) })
      .where(eq(job.id, due.id));
    await jobs.flushOutbox(1);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ jobId: due.id, outboxId: expect.any(String) });
    await db
      .update(job)
      .set({ runAfter: new Date(Date.now() - 1_000) })
      .where(eq(job.id, future.id));
    await jobs.flushOutbox();
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({ jobId: future.id, outboxId: outbox!.id });
  });

  it("rejects old generations and resolved duplicate incidents after an admin retry", async () => {
    const db = createDb(env.DB);
    const jobs = createJobService(db, { send: async () => sentToQueue() });
    const created = await jobs.create({
      idempotencyKey: `generation:${crypto.randomUUID()}`,
      type: "ai.generate",
      payload: {},
    });
    const [original] = await db.select().from(jobOutbox).where(eq(jobOutbox.jobId, created.id));
    const first = createDeadLetterBatch(created.id, original!.id);
    await consumeDeadLetterMessages(db, first.batch);
    const [incident] = await db
      .select()
      .from(failedJobEvent)
      .where(eq(failedJobEvent.jobId, created.id));
    expect(await jobs.retryFailed({ failedJobEventId: incident!.id, resolvedBy: "admin" })).toBe(
      true,
    );
    const [current] = await db.select().from(jobOutbox).where(eq(jobOutbox.jobId, created.id));
    expect(current!.id).not.toBe(original!.id);

    await consumeDeadLetterMessages(db, first.batch);
    const stale = createDeadLetterBatch(created.id, original!.id);
    const legacy = createDeadLetterBatch(created.id);
    await consumeDeadLetterMessages(db, stale.batch);
    await consumeDeadLetterMessages(db, legacy.batch);
    expect(stale.acknowledgements()).toBe(1);
    expect(legacy.acknowledgements()).toBe(1);
    let calls = 0;
    const handlers = {
      "ai.generate": async () => {
        calls++;
      },
    };
    await expect(
      processJobMessage(db, { jobId: created.id, outboxId: original!.id }, handlers),
    ).resolves.toBeNull();
    await expect(processJobMessage(db, { jobId: created.id }, handlers)).resolves.toBeNull();
    expect(calls).toBe(0);
    const [pending] = await db.select().from(job).where(eq(job.id, created.id));
    expect(pending).toMatchObject({ status: "pending", attemptCount: 0 });
    expect(
      await db.select().from(failedJobEvent).where(eq(failedJobEvent.jobId, created.id)),
    ).toHaveLength(1);
    await processJobMessage(db, { jobId: created.id, outboxId: current!.id }, handlers);
    expect(calls).toBe(1);
  });

  it("returns an accepted retry with its audit when publishing fails and Cron delivers later", async () => {
    const db = createDb(env.DB);
    let rejectPublish = false;
    const sent: unknown[] = [];
    const jobs = createJobService(db, {
      send: async (body) => {
        if (rejectPublish) throw new Error("Queue temporarily unavailable");
        sent.push(body);
        return sentToQueue();
      },
    });
    const created = await jobs.create({
      idempotencyKey: `retry-publish:${crypto.randomUUID()}`,
      type: "ai.generate",
      payload: {},
    });
    await consumeDeadLetterMessages(db, createDeadLetterBatch(created.id).batch);
    const [incident] = await db
      .select()
      .from(failedJobEvent)
      .where(eq(failedJobEvent.jobId, created.id));
    rejectPublish = true;
    expect(
      await jobs.retryFailed({
        failedJobEventId: incident!.id,
        resolvedBy: "admin",
        resolvedByEmail: "admin@example.test",
      }),
    ).toBe(true);
    const [pending] = await db.select().from(jobOutbox).where(eq(jobOutbox.jobId, created.id));
    expect(pending).toMatchObject({ status: "pending", leaseToken: null });
    const audits = await db
      .select()
      .from(adminAuditLog)
      .where(eq(adminAuditLog.entityId, incident!.id));
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: "jobs.failed.retried", actorId: "admin" });
    const history = await db.select().from(jobEvent).where(eq(jobEvent.jobId, created.id));
    expect(history.filter((event) => event.type === "queued")).toHaveLength(2);
    expect(
      history.every((event) => event.createdAt.getFullYear() === new Date().getFullYear()),
    ).toBe(true);
    rejectPublish = false;
    await jobs.flushOutbox();
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({ jobId: created.id, outboxId: pending!.id });
  });

  it("rolls back terminalization and history if the failed incident insert fails", async () => {
    const db = createDb(env.DB);
    const jobs = createJobService(db, { send: async () => sentToQueue() });
    const created = await jobs.create({
      idempotencyKey: `dlq-rollback:${crypto.randomUUID()}`,
      type: "ai.generate",
      payload: {},
    });
    await env.DB.prepare(`CREATE TRIGGER reject_dlq_incident BEFORE INSERT ON failed_job_event
      WHEN NEW.job_id = '${created.id}' BEGIN SELECT RAISE(ABORT, 'injected incident failure'); END`).run();
    try {
      const delivery = createDeadLetterBatch(created.id);
      await consumeDeadLetterMessages(db, delivery.batch);
      expect(delivery.acknowledgements()).toBe(0);
      expect(delivery.retryDelays).toEqual([60]);
      const [pending] = await db.select().from(job).where(eq(job.id, created.id));
      expect(pending).toMatchObject({ status: "pending", completedAt: null });
      expect(await db.select().from(jobEvent).where(eq(jobEvent.jobId, created.id))).toHaveLength(
        1,
      );
      expect(
        await db.select().from(failedJobEvent).where(eq(failedJobEvent.jobId, created.id)),
      ).toEqual([]);
    } finally {
      await env.DB.prepare("DROP TRIGGER reject_dlq_incident").run();
    }
  });

  it("terminalizes pending and expired-running jobs so administrators can retry them", async () => {
    const db = createDb(env.DB);
    const now = new Date();
    const sent: unknown[] = [];
    const jobs = createJobService(db, {
      send: async (body: unknown) => {
        sent.push(body);
        return sentToQueue();
      },
    });
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
      await db.insert(jobOutbox).values({
        id: crypto.randomUUID(),
        jobId,
        status: "published",
        attempts: 1,
        publishedAt: now,
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
        return sentToQueue();
      },
    });
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
    const [outbox] = await db.select().from(jobOutbox).where(eq(jobOutbox.jobId, jobId));
    expect(outbox!.id).toMatch(/^retry:/);
    expect(sent).toEqual([{ jobId, outboxId: outbox!.id }]);
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
    const jobs = createJobService(db, { send: async () => sentToQueue() });

    await expect(
      jobs.retryFailed({ failedJobEventId: eventId, resolvedBy: "admin-1" }),
    ).resolves.toBe(false);

    const [event] = await db.select().from(failedJobEvent).where(eq(failedJobEvent.id, eventId));
    expect(event).toMatchObject({ resolvedAt: null, resolution: null, resolutionToken: null });
  });
});
