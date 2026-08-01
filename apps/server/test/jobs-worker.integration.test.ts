import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { failedJobEvent, job, jobEvent } from "@/db/schema/jobs";
import worker from "@/index";
import { jobRegistry } from "@/modules/jobs";
import { createJobService } from "@/modules/jobs/job.service";

function createQueueBatch(queue: string, body: unknown) {
  let acknowledgements = 0;
  const retryDelays: number[] = [];
  const message: Message<unknown> = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    body,
    attempts: 1,
    ack: () => acknowledgements++,
    retry: (options) => retryDelays.push(options?.delaySeconds ?? 0),
  };
  const batch: MessageBatch<unknown> = {
    queue,
    messages: [message],
    metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
    retryAll: (options) => retryDelays.push(options?.delaySeconds ?? 0),
    ackAll: () => acknowledgements++,
  };
  return { batch, getAcknowledgements: () => acknowledgements, retryDelays };
}

function createJobs(db: ReturnType<typeof createDb>) {
  return createJobService(db, {
    send: async () => ({ metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } } }),
  });
}

describe("Worker Queue routing", () => {
  it("runs a registered handler through the Worker queue entrypoint", async () => {
    const db = createDb(env.DB);
    const jobs = createJobs(db);
    const record = await jobs.create({
      idempotencyKey: crypto.randomUUID(),
      type: "email.send",
      payload: { template: "welcome" },
    });
    const type = `test.queue.success.${crypto.randomUUID()}`;
    await db.update(job).set({ type }).where(eq(job.id, record.id));
    jobRegistry.register(type, async () => ({ delivered: true }));

    try {
      const queue = createQueueBatch("tanstack-template-jobs", { jobId: record.id });
      await worker.queue(queue.batch, env);

      const [persisted] = await db.select().from(job).where(eq(job.id, record.id));
      expect(queue.getAcknowledgements()).toBe(1);
      expect(queue.retryDelays).toEqual([]);
      expect(persisted).toMatchObject({ status: "succeeded", result: { delivered: true } });
    } finally {
      delete jobRegistry.handlers[type];
    }
  });

  it("reclaims a running job with a missing lease and lets cancellation win", async () => {
    const db = createDb(env.DB);
    const jobs = createJobs(db);
    const record = await jobs.create({
      idempotencyKey: crypto.randomUUID(),
      type: "ai.generate",
      payload: { prompt: "test" },
    });
    const type = `test.queue.cancel.${crypto.randomUUID()}`;
    await db
      .update(job)
      .set({ type, status: "running", lockedAt: null, startedAt: new Date() })
      .where(eq(job.id, record.id));
    jobRegistry.register(type, async ({ id }) => {
      await jobs.cancel(id);
      return { shouldNotPersist: true };
    });

    try {
      const queue = createQueueBatch("tanstack-template-jobs", { jobId: record.id });
      await worker.queue(queue.batch, env);

      const [persisted] = await db.select().from(job).where(eq(job.id, record.id));
      const events = await db
        .select({ type: jobEvent.type })
        .from(jobEvent)
        .where(eq(jobEvent.jobId, record.id));
      expect(queue.getAcknowledgements()).toBe(1);
      expect(persisted).toMatchObject({ status: "cancelled", result: null });
      expect(events.map((event) => event.type)).not.toContain("succeeded");
    } finally {
      delete jobRegistry.handlers[type];
    }
  });

  it("routes a dead-letter batch through the Worker entrypoint", async () => {
    const db = createDb(env.DB);
    const jobs = createJobs(db);
    const record = await jobs.create({
      idempotencyKey: crypto.randomUUID(),
      type: "data.import",
      payload: { source: "test" },
    });
    await db
      .update(job)
      .set({
        status: "failed",
        error: "provider timeout",
        attemptCount: 3,
        completedAt: new Date(),
      })
      .where(eq(job.id, record.id));

    const queue = createQueueBatch(env.JOB_QUEUE_DLQ_NAME, { jobId: record.id });
    await worker.queue(queue.batch, env);

    const events = await db
      .select()
      .from(failedJobEvent)
      .where(eq(failedJobEvent.jobId, record.id));
    expect(queue.getAcknowledgements()).toBe(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ jobType: "data.import", error: "provider timeout" });
  });
});
