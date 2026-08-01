import { ORPCError } from "@orpc/server";
import { MEMBERSHIP_TIER_RANK, type MembershipTier } from "@repo/app-config";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema/auth";
import { isAdminEmail } from "@/lib/admin";
import type { Context } from "@/lib/context";

export type RequestUser = NonNullable<Context["session"]>["user"];

/** Returns the active signed-in user or stops the request. */
export async function requireUser(context: Context): Promise<RequestUser> {
  const requestUser = context.session?.user;
  if (!requestUser) {
    throw new ORPCError("UNAUTHORIZED");
  }

  const [currentUser] = await context.db
    .select({ deletedAt: user.deletedAt })
    .from(user)
    .where(eq(user.id, requestUser.id));
  if (currentUser?.deletedAt) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return requestUser;
}

/** Returns the allowlisted administrator or stops the request. */
export async function requireAdmin(context: Context): Promise<RequestUser> {
  const requestUser = await requireUser(context);
  if (!isAdminEmail(requestUser.email, context.env.ADMIN_EMAILS)) {
    throw new ORPCError("FORBIDDEN");
  }
  return requestUser;
}

/** Requires a configured product capability resolved from verified billing state. */
export async function requireCapability(context: Context, capability: string) {
  const requestUser = await requireUser(context);
  if (!(await context.capabilities.can({ userId: requestUser.id }, capability))) {
    throw new ORPCError("FORBIDDEN");
  }
  return requestUser;
}

/** Requires the webhook-backed membership entitlement tier or higher. */
export async function requireEntitlement(context: Context, minimumTier: MembershipTier) {
  const requestUser = await requireUser(context);
  const billingStatus = await context.payments.getBillingStatus({ userId: requestUser.id });
  const entitlement = billingStatus.currentEntitlement;
  if (MEMBERSHIP_TIER_RANK[entitlement.tier] < MEMBERSHIP_TIER_RANK[minimumTier]) {
    throw new ORPCError("FORBIDDEN");
  }
  return { user: requestUser, entitlement };
}
