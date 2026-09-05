import { env } from "cloudflare:workers";
import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { job, jobOutbox } from "@/db/schema/jobs";
import { createJobService } from "@/modules/jobs/job.service";

describe("job idempotency", () => {
  it("returns the original job for a repeated key and rejects changed input", async () => {
    const db = createDb(env.DB);
    const jobs = createJobService(db, { send: async () => undefined } as unknown as Queue<{
      jobId: string;
    }>);
    const idempotencyKey = crypto.randomUUID();
    const input = {
      idempotencyKey,
      type: "ai.generate",
      payload: { prompt: "write a chapter", settings: { temperature: 0.7 } },
    };

    const first = await jobs.create(input);
    const repeated = await jobs.create({
      ...input,
      payload: { settings: { temperature: 0.7 }, prompt: "write a chapter" },
    });
    expect(repeated.id).toBe(first.id);

    const [rows] = await db
      .select({ count: count() })
      .from(job)
      .where(eq(job.idempotencyKey, idempotencyKey));
    expect(rows?.count).toBe(1);
    await expect(
      jobs.create({ ...input, payload: { prompt: "different chapter" } }),
    ).rejects.toThrow("different input");
  });

  it("rejects retry budgets outside the configured Queue delivery limit before persisting a job", async () => {
    const db = createDb(env.DB);
    const jobs = createJobService(db, {
      send: async () => ({ metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } } }),
    });

    await expect(
      jobs.create({
        idempotencyKey: crypto.randomUUID(),
        type: "data.export",
        payload: { format: "csv" },
        maxAttempts: 0,
      }),
    ).rejects.toThrow("integer from 1 to 4");
    await expect(
      jobs.create({
        idempotencyKey: crypto.randomUUID(),
        type: "data.export",
        payload: { format: "csv" },
        maxAttempts: 5,
      }),
    ).rejects.toThrow("integer from 1 to 4");
  });

  it("claims an outbox publication once when dispatchers overlap", async () => {
    const db = createDb(env.DB);
    const now = new Date();
    const jobId = crypto.randomUUID();
    await db.batch([
      db.insert(job).values({
        id: jobId,
        idempotencyKey: `outbox:${jobId}`,
        type: "ai.generate",
        ownerId: null,
        status: "pending",
        payload: {},
        payloadHash: "hash",
        result: null,
        error: null,
        attemptCount: 0,
        maxAttempts: 3,
        runAfter: now,
        lockedAt: null,
        leaseToken: null,
        leaseUntil: null,
        startedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(jobOutbox).values({
        id: crypto.randomUUID(),
        jobId,
        status: "pending",
        leaseToken: null,
        leaseUntil: null,
        attempts: 0,
        lastError: null,
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    let releaseSend!: () => void;
    let signalSendStarted!: () => void;
    const sent = new Promise<void>((resolve) => {
      releaseSend = resolve;
    });
    const sendStarted = new Promise<void>((resolve) => {
      signalSendStarted = resolve;
    });
    let sends = 0;
    const jobs = createJobService(db, {
      send: async () => {
        sends += 1;
        signalSendStarted();
        await sent;
      },
    } as unknown as Queue<{ jobId: string }>);

    const first = jobs.flushOutbox();
    await sendStarted;
    const second = jobs.flushOutbox();
    releaseSend();
    await Promise.all([first, second]);

    const [outbox] = await db.select().from(jobOutbox).where(eq(jobOutbox.jobId, jobId));
    expect(sends).toBe(1);
    expect(outbox).toMatchObject({ status: "published", attempts: 1, leaseToken: null });
  });
});
