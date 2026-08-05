import { adminAuditRouter } from "./audit";
import { adminBillingRouter } from "./billing";
import { adminCoreRouter } from "./core";
import { adminJobsRouter } from "./jobs";

/** Stable admin namespace assembled from explicit platform domains. */
export const adminRouter = {
  ...adminCoreRouter,
  ...adminAuditRouter,
  ...adminJobsRouter,
  ...adminBillingRouter,
};
