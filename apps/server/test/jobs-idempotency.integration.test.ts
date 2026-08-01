import { env } from "cloudflare:workers";
import { count, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { job } from "@/db/schema/jobs";
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

  it("rejects an invalid retry budget before persisting a job", async () => {
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
    ).rejects.toThrow("positive integer");
  });
});
