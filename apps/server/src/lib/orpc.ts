import { ORPCError, os } from "@orpc/server";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema/auth";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  const [currentUser] = await context.db
    .select({ deletedAt: user.deletedAt })
    .from(user)
    .where(eq(user.id, context.session.user.id));

  if (currentUser?.deletedAt) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next();
});

export const protectedProcedure = publicProcedure.use(requireAuth);
