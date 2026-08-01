import { ORPCError, os } from "@orpc/server";
import { isServerFeatureEnabled, productFeatures, type ServerFeature } from "./module-config";
import { requireAdmin as requireAdminGuard, requireUser } from "@/auth/guards";
import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  await requireUser(context);
  return next();
});

export const protectedProcedure = publicProcedure.use(requireAuth);

function requireFeature(feature: ServerFeature) {
  return o.middleware(async ({ next }) => {
    if (!isServerFeatureEnabled(feature)) {
      throw new ORPCError("NOT_FOUND", {
        message: "Feature unavailable",
        data: { code: "FEATURE_DISABLED" },
      });
    }
    return next();
  });
}

const requireWebCreditPurchases = o.middleware(async ({ next }) => {
  if (!productFeatures.web.creditPurchases) {
    throw new ORPCError("NOT_FOUND", {
      message: "Feature unavailable",
      data: { code: "FEATURE_DISABLED" },
    });
  }
  return next();
});

export const billingProcedure = publicProcedure.use(requireFeature("billing"));
export const protectedBillingProcedure = protectedProcedure.use(requireFeature("billing"));
export const creditsProcedure = publicProcedure.use(requireFeature("credits"));
export const protectedCreditsProcedure = protectedProcedure.use(requireFeature("credits"));
export const webCreditPurchaseProcedure = protectedCreditsProcedure.use(requireWebCreditPurchases);
export const storageProcedure = protectedProcedure.use(requireFeature("storage"));

const requireAdminMiddleware = o.middleware(async ({ context, next }) => {
  await requireAdminGuard(context);
  return next();
});

/** Use this for every procedure that can read or change administrator-only data. */
export const adminProcedure = protectedProcedure
  .use(requireFeature("admin"))
  .use(requireAdminMiddleware);
