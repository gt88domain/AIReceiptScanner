import type { RouterClient } from "@orpc/server";
import { moduleRouters } from "../modules";
import { publicProcedure } from "../lib/orpc";
import { adminRouter } from "./admin";
import { creditsRouter } from "./common/credits";
import { commonPaymentsRouter } from "./common/payments";
import { storageRouter } from "./common/storage";
import { getCurrentUserFromContext, usersRouter } from "./common/users";
import { webCreditsRouter } from "./web/credits";
import { paymentsRouter } from "./web/payments";

const healthCheck = publicProcedure.handler(() => "OK");
const getCurrentUser = publicProcedure.handler(({ context }) => getCurrentUserFromContext(context));

type PlatformContractRouter = {
  healthCheck: typeof healthCheck;
  getCurrentUser: typeof getCurrentUser;
  users: typeof usersRouter;
  admin: typeof adminRouter;
  storage: typeof storageRouter;
  payments: typeof commonPaymentsRouter;
  credits: typeof creditsRouter;
  web: { payments: typeof paymentsRouter; credits: typeof webCreditsRouter };
  native: Record<never, never>;
} & typeof moduleRouters;

/** Stable platform API contract for the default web client; not a runtime registration promise. */
export const platformContractRouter: PlatformContractRouter = {
  healthCheck,
  getCurrentUser,
  users: usersRouter,
  admin: adminRouter,
  storage: storageRouter,
  payments: commonPaymentsRouter,
  credits: creditsRouter,
  ...moduleRouters,
  web: { payments: paymentsRouter, credits: webCreditsRouter },
  native: {},
};

/** Compatibility name retained for existing server and downstream imports. */
export const appRouter = platformContractRouter;
export type AppRouter = typeof platformContractRouter;
export type PlatformClientContract = RouterClient<typeof platformContractRouter>;
export type AppRouterClient = PlatformClientContract;
