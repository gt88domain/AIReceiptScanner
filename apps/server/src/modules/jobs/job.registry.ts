import type { JobHandler, JobHandlers, JobType } from "./job.types";

/** Process-wide registry populated by product modules during Worker startup. */
export function createJobRegistry() {
  const handlers: JobHandlers = {};

  return {
    handlers,
    register(type: JobType, handler: JobHandler) {
      if (handlers[type]) {
        throw new Error(`Job handler already registered: ${type}`);
      }
      handlers[type] = handler;
    },
  };
}

export const jobRegistry = createJobRegistry();

/** Registers a product-owned handler without creating another queue framework. */
export function registerJobHandler(type: JobType, handler: JobHandler) {
  jobRegistry.register(type, handler);
}
