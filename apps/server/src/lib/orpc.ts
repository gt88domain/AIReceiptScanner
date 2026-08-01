import { os } from "@orpc/server";
import { requireAdmin as requireAdminGuard, requireUser } from "@/auth/guards";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  await requireUser(context);
  return next();
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireAdminMiddleware = o.middleware(async ({ context, next }) => {
  await requireAdminGuard(context);
  return next();
});

/** Use this for every procedure that can read or change administrator-only data. */
export const adminProcedure = protectedProcedure.use(requireAdminMiddleware);
