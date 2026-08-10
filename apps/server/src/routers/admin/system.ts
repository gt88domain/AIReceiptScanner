import {
  controlIntegrationsOutputSchema,
  controlSystemOutputSchema,
} from "@repo/shared/control-read";
import { adminProcedure } from "@/lib/orpc";
import { getAdminIntegrationsReadModel, getAdminSystemReadModel } from "@/modules/control-read";

/** Existing Admin System delegates to the transport-neutral read model. */
export const adminSystemRouter = {
  getIntegrations: adminProcedure
    .output(controlIntegrationsOutputSchema)
    .handler(({ context }) => getAdminIntegrationsReadModel(context)),

  getSystem: adminProcedure
    .output(controlSystemOutputSchema)
    .handler(({ context }) => getAdminSystemReadModel(context)),
};
