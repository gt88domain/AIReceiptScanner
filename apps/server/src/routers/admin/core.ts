import {
  controlListUsersInputSchema,
  controlListUsersOutputSchema,
  controlUserSummaryOutputSchema,
} from "@repo/shared/control-read";
import { isAdminEmail } from "@/lib/admin";
import { adminProcedure, protectedProcedure } from "@/lib/orpc";
import { getAdminUserSummaryReadModel, listAdminUsersReadModel } from "@/modules/control-read";

/** Admin access and user management do not depend on Jobs, Billing, or Storage. */
export const adminCoreRouter = {
  getAccess: protectedProcedure.handler(({ context }) => ({
    isAdmin:
      context.runtimeConfig.features.admin &&
      isAdminEmail(context.session?.user.email, context.env.ADMIN_EMAILS),
  })),

  getUserSummary: adminProcedure
    .output(controlUserSummaryOutputSchema)
    .handler(({ context }) => getAdminUserSummaryReadModel(context.db)),

  listUsers: adminProcedure
    .input(controlListUsersInputSchema)
    .output(controlListUsersOutputSchema)
    .handler(({ context, input }) => listAdminUsersReadModel(context, input)),
};
