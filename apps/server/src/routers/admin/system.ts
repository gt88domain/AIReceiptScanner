import {
  controlIntegrationsOutputSchema,
  controlSystemOutputSchema,
} from "@repo/shared/control-read";
import { sql } from "drizzle-orm";
import { z } from "zod";
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

  getMigrationStatus: adminProcedure
    .output(
      z.object({
        available: z.boolean(),
        applied: z.number().int().nonnegative(),
        latestAppliedAt: z.date().nullable(),
      }),
    )
    .handler(async ({ context }) => {
      const tables = await context.db.all<{ name: string }>(sql`
        select name from sqlite_master where type = 'table' and name = '__drizzle_migrations'
      `);
      if (tables.length === 0) {
        return { available: false, applied: 0, latestAppliedAt: null };
      }
      const result = await context.db.all<{ applied: number; latestAppliedAt: number | null }>(sql`
        select count(*) as applied, max(created_at) as latestAppliedAt from __drizzle_migrations
      `);
      const row = result.at(0);
      return {
        available: true,
        applied: Number(row?.applied ?? 0),
        latestAppliedAt: row?.latestAppliedAt ? new Date(row.latestAppliedAt) : null,
      };
    }),
};
