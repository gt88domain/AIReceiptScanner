import { ORPCError, os } from "@orpc/server";
import { isAdminEmail } from "./admin";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.authenticatedUser) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next();
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireAdmin = o.middleware(async ({ context, next }) => {
  if (!isAdminEmail(context.authenticatedUser?.email, context.env.ADMIN_EMAILS)) {
    throw new ORPCError("FORBIDDEN");
  }
  return next();
});

/** Use this for every procedure that can read or change administrator-only data. */
export const adminProcedure = protectedProcedure.use(requireAdmin);
