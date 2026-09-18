import {
  controlListAuditInputSchema,
  controlListAuditOutputSchema,
} from "@repo/shared/control-read";
import { adminProcedure } from "@/lib/orpc";
import { listAdminAuditReadModel } from "@/modules/control-read";

/** Existing Admin Audit delegates to the transport-neutral read model. */
export const adminAuditRouter = {
  listAuditLog: adminProcedure
    .input(controlListAuditInputSchema)
    .output(controlListAuditOutputSchema)
    .handler(({ context, input }) => listAdminAuditReadModel(context.db, input)),
};
