import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../lib/orpc";
import { creditsRouter } from "./common/credits";
import { commonPaymentsRouter } from "./common/payments";
import { storageRouter } from "./common/storage";
import { getCurrentUserFromContext, usersRouter } from "./common/users";
import { webCreditsRouter } from "./web/credits";
import { paymentsRouter } from "./web/payments";

/**
 * App Router - Platform-organized API routes
 *
 * Structure:
 * - Root level: Common APIs (shared by web + native)
 * - web: Web-specific APIs
 * - native: Native-specific APIs
 *
 * Note: File serving (GET /api/storage/*) uses HTTP for caching/CDN compatibility.
 */
export const appRouter = {
  // ============ Common APIs (web + native) ============
  healthCheck: publicProcedure.handler(() => "OK"),
  getCurrentUser: publicProcedure.handler(({ context }) => getCurrentUserFromContext(context)),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  users: usersRouter,
  storage: storageRouter,
  payments: commonPaymentsRouter,
  credits: creditsRouter,
  // ============ Web-specific APIs ============
  web: {
    payments: paymentsRouter,
    credits: webCreditsRouter,
  },

  // ============ Native-specific APIs ============
  native: {
    // Example: push notifications, device registration
    // pushNotification: pushNotificationRouter,
  },
};

/** Server-side oRPC router type. */
export type AppRouter = typeof appRouter;
/** Client type generated from the oRPC router. */
export type AppRouterClient = RouterClient<typeof appRouter>;
