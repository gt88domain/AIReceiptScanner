import { adminAuditRouter } from "./audit";
import { adminBillingRouter } from "./billing";
import { adminCoreRouter } from "./core";
import { adminJobsRouter } from "./jobs";
import type { PlatformComposition } from "@repo/app-config";

/** Stable platform contract; runtime composition is built separately. */
export const adminRouter = {
  ...adminCoreRouter,
  ...adminAuditRouter,
  ...adminJobsRouter,
  ...adminBillingRouter,
};

/** Runtime-only composition; this is intentionally separate from the stable client contract. */
export function buildRuntimeAdminRouter(composition: PlatformComposition) {
  const modules = composition.modules.admin;
  return {
    ...(modules.core ? adminCoreRouter : {}),
    ...(modules.audit ? adminAuditRouter : {}),
    ...(modules.jobs ? adminJobsRouter : {}),
    ...(modules.billing ? adminBillingRouter : {}),
  };
}
