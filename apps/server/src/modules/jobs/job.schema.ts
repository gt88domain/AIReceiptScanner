export type JobQueueMessage = { jobId: string };

export type JobHandlerInput = {
  id: string;
  ownerId: string | null;
  payload: Record<string, unknown>;
};

export type JobHandler = (input: JobHandlerInput) => Promise<Record<string, unknown> | void>;
export type JobHandlers = Record<string, JobHandler>;
