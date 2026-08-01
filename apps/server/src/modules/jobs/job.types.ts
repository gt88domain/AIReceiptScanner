export const DEFAULT_JOB_TYPES = [
  "email.send",
  "ai.generate",
  "import.run",
  "asset.process",
] as const;

/** Built-in suggestions plus product-owned names such as `novel.chapter.generate`. */
export type JobType = (typeof DEFAULT_JOB_TYPES)[number] | (string & {});

export type JobQueueMessage = { jobId: string };

export type JobHandlerInput = {
  id: string;
  ownerId: string | null;
  payload: Record<string, unknown>;
};

export type JobHandler = (input: JobHandlerInput) => Promise<Record<string, unknown> | void>;
export type JobHandlers = Record<string, JobHandler>;
