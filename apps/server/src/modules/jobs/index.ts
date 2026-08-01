import type { JobHandlers } from "./job.schema";

/** Register product job handlers here. Keep each handler in its owning module. */
export const jobHandlers: JobHandlers = {};

export { createJobService } from "./job.service";
