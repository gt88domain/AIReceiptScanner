import type { Database } from "@/db";
import { jobEvent, type JOB_EVENT_TYPES } from "@/db/schema/jobs";

export async function recordJobEvent(
  db: Database,
  input: { jobId: string; type: (typeof JOB_EVENT_TYPES)[number]; detail?: string },
) {
  await db.insert(jobEvent).values({
    id: crypto.randomUUID(),
    ...input,
    createdAt: new Date(),
  });
}
