import {
  controlAnalyticsOutputSchema,
  controlGetAnalyticsInputSchema,
} from "@repo/shared/control-read";
import { adminProcedure } from "@/lib/orpc";
import { getAdminAnalyticsReadModel } from "@/modules/control-read";

/** Existing Admin Analytics delegates to the transport-neutral read model. */
export const adminAnalyticsRouter = {
  getAnalytics: adminProcedure
    .input(controlGetAnalyticsInputSchema)
    .output(controlAnalyticsOutputSchema)
    .handler(({ context, input }) => getAdminAnalyticsReadModel(context, input)),
};
