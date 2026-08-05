import type { PlatformComposition } from "@repo/app-config";
import type { AnyRouter } from "@orpc/server";
import { moduleRouters } from "../modules";
import { publicProcedure } from "../lib/orpc";
import { buildRuntimeAdminRouter } from "./admin";
import { creditsRouter } from "./common/credits";
import { commonPaymentsRouter } from "./common/payments";
import { storageRouter } from "./common/storage";
import { getCurrentUserFromContext, usersRouter } from "./common/users";
import { webCreditsRouter } from "./web/credits";
import { paymentsRouter } from "./web/payments";

const healthCheck = publicProcedure.handler(() => "OK");
const getCurrentUser = publicProcedure.handler(({ context }) => getCurrentUserFromContext(context));

/** Actual server API surface. Disabled namespaces are omitted instead of returning fake success. */
export function buildRuntimeAppRouter(composition: PlatformComposition): AnyRouter {
  const modules = composition.modules;
  return {
    healthCheck,
    getCurrentUser,
    users: usersRouter,
    ...moduleRouters,
    ...(modules.admin.core ? { admin: buildRuntimeAdminRouter(composition) } : {}),
    ...(modules.storage ? { storage: storageRouter } : {}),
    ...(modules.billing ? { payments: commonPaymentsRouter } : {}),
    ...(modules.credits ? { credits: creditsRouter } : {}),
    web: {
      ...(modules.webBilling ? { payments: paymentsRouter } : {}),
      ...(modules.webCreditPurchases ? { credits: webCreditsRouter } : {}),
    },
    native: {},
  };
}

export type RuntimeAppRouter = ReturnType<typeof buildRuntimeAppRouter>;
