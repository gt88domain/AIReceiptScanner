import { z } from "zod";
import { requireJobsService } from "@/lib/jobs-access";
import { adminProcedure } from "@/lib/orpc";
import { recordAdminAuditLog } from "@/modules/audit";
import {
  countFailedJobEvents,
  listFailedJobEvents,
  resolveFailedJobEvent,
} from "@/modules/jobs/job.dead-letter";

const listFailedJobsInputSchema = z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(50),
});

const failedJobEventActionSchema = z.object({ id: z.string().min(1) });
const failedJobEventSchema = z.object({
  id: z.string(),
  queueMessageId: z.string(),
  jobId: z.string(),
  jobType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  error: z.string(),
  attempts: z.number(),
  failedAt: z.date(),
  resolvedAt: z.date().nullable(),
  resolvedBy: z.string().nullable(),
  resolution: z.enum(["retried", "ignored", "refunded"]).nullable(),
});

/** Stable Admin Jobs namespace. Every operation fails before Jobs DB access when disabled. */
export const adminJobsRouter = {
  listFailedJobs: adminProcedure
    .input(listFailedJobsInputSchema)
    .output(
      z.object({ data: z.array(failedJobEventSchema), pageCount: z.number(), total: z.number() }),
    )
    .handler(async ({ context, input }) => {
      requireJobsService(context);
      const [data, total] = await Promise.all([
        listFailedJobEvents(context.db, {
          limit: input.perPage,
          offset: (input.page - 1) * input.perPage,
        }),
        countFailedJobEvents(context.db),
      ]);
      return { data, pageCount: Math.ceil(total / input.perPage), total };
    }),

  retryFailedJob: adminProcedure
    .input(failedJobEventActionSchema)
    .output(z.object({ retried: z.boolean() }))
    .handler(async ({ context, input }) => {
      const actor = context.session!.user;
      const retried = await requireJobsService(context).retryFailed({
        failedJobEventId: input.id,
        resolvedBy: actor.id,
      });
      if (retried) {
        await recordAdminAuditLog(context.db, {
          actor,
          action: "jobs.failed.retried",
          entity: { type: "failed_job_event", id: input.id },
          after: { resolution: "retried" },
        });
      }
      return { retried };
    }),

  ignoreFailedJob: adminProcedure
    .input(failedJobEventActionSchema)
    .output(z.object({ ignored: z.boolean() }))
    .handler(async ({ context, input }) => {
      const actor = context.session!.user;
      requireJobsService(context);
      const ignored = await resolveFailedJobEvent(context.db, {
        id: input.id,
        resolvedBy: actor.id,
        resolution: "ignored",
      });
      if (ignored) {
        await recordAdminAuditLog(context.db, {
          actor,
          action: "jobs.failed.ignored",
          entity: { type: "failed_job_event", id: input.id },
          after: { resolution: "ignored" },
        });
      }
      return { ignored: Boolean(ignored) };
    }),
};
