import { adminAuditRouter } from "./audit";
import { adminAnalyticsRouter } from "./analytics";
import { adminBillingRouter } from "./billing";
import { adminCoreRouter } from "./core";
import { adminJobsRouter } from "./jobs";
import { adminSystemRouter } from "./system";
import type { PlatformComposition } from "@repo/app-config";

type AdminRouter = typeof adminCoreRouter &
  typeof adminAnalyticsRouter &
  typeof adminSystemRouter &
  typeof adminAuditRouter &
  typeof adminJobsRouter &
  typeof adminBillingRouter;

/** Stable platform contract; runtime composition is built separately. */
export const adminRouter: AdminRouter = {
  ...adminCoreRouter,
  ...adminAnalyticsRouter,
  ...adminSystemRouter,
  ...adminAuditRouter,
  ...adminJobsRouter,
  ...adminBillingRouter,
};

/** Runtime-only composition; this is intentionally separate from the stable client contract. */
export function buildRuntimeAdminRouter(composition: PlatformComposition): Partial<AdminRouter> {
  const modules = composition.modules.admin;
  return {
    ...(modules.core ? { ...adminCoreRouter, ...adminAnalyticsRouter, ...adminSystemRouter } : {}),
    ...(modules.audit ? adminAuditRouter : {}),
    ...(modules.jobs ? adminJobsRouter : {}),
    ...(modules.billing ? adminBillingRouter : {}),
  };
}
