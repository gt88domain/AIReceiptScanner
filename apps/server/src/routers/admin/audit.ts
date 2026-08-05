import { z } from "zod";
import { adminProcedure } from "@/lib/orpc";
import { countAdminAuditLogs, listAdminAuditLogs } from "@/modules/audit/audit.repository";

const listAuditLogInputSchema = z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(50),
});
const auditSnapshotSchema = z.record(z.string(), z.unknown()).nullable();
const auditLogSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  actorEmail: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  before: auditSnapshotSchema,
  after: auditSnapshotSchema,
  createdAt: z.date(),
});

/** The audit surface stays available to Admin Core when optional modules are disabled. */
export const adminAuditRouter = {
  listAuditLog: adminProcedure
    .input(listAuditLogInputSchema)
    .output(z.object({ data: z.array(auditLogSchema), pageCount: z.number(), total: z.number() }))
    .handler(async ({ context, input }) => {
      const [data, total] = await Promise.all([
        listAdminAuditLogs(context.db, {
          limit: input.perPage,
          offset: (input.page - 1) * input.perPage,
        }),
        countAdminAuditLogs(context.db),
      ]);
      return { data, pageCount: Math.ceil(total / input.perPage), total };
    }),
};
