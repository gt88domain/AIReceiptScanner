export const DEFAULT_JOB_TYPES = [
  "email.send",
  "ai.generate",
  "asset.process",
  "data.import",
  "data.export",
] as const;

/** Built-in suggestions plus product-owned names such as `novel.chapter.generate`. */
export type JobType = (typeof DEFAULT_JOB_TYPES)[number] | (string & {});

export type JobQueueMessage = { jobId: string };

export type JobHandlerInput = {
  id: string;
  /**
   * Stable across every Queue delivery of this job. Pass a namespaced form of
   * this value to every external provider that supports idempotency keys.
   */
  idempotencyKey: string;
  ownerId: string | null;
  payload: Record<string, unknown>;
};

export type JobHandler = (input: JobHandlerInput) => Promise<Record<string, unknown> | void>;
export type JobHandlers = Record<string, JobHandler>;
