import {
  controlGetAnalyticsInputSchema,
  controlGetIntegrationsInputSchema,
  controlGetOverviewInputSchema,
  controlGetSnapshotInputSchema,
  controlGetSystemInputSchema,
  controlListAuditInputSchema,
  controlListUsersInputSchema,
  type ControlReadV1,
} from "@repo/shared/control-read";
import {
  getAdminAnalyticsReadModel,
  getAdminBillingOverviewReadModel,
  getAdminIntegrationsReadModel,
  getAdminSystemReadModel,
  getAdminUserSummaryReadModel,
  getControlSnapshotReadModel,
  listAdminAuditReadModel,
  listAdminUsersReadModel,
  type ControlReadDependencies,
} from "./read-models";

export * from "./read-models";

/**
 * Internal-only, transport-neutral facade. Transport registration is
 * deliberately absent until Control 2.
 */
export function createControlReadV1(dependencies: ControlReadDependencies): ControlReadV1 {
  return {
    getSnapshot: async (input) => {
      controlGetSnapshotInputSchema.parse(input ?? {});
      return getControlSnapshotReadModel(dependencies);
    },
    getOverview: async (input) => {
      controlGetOverviewInputSchema.parse(input ?? {});
      const [userSummary, billing] = await Promise.all([
        getAdminUserSummaryReadModel(dependencies.db),
        dependencies.runtimeConfig.composition.modules.billing
          ? getAdminBillingOverviewReadModel(dependencies)
          : Promise.resolve(null),
      ]);
      return { userSummary, billing };
    },
    getAnalytics: (input) =>
      getAdminAnalyticsReadModel(dependencies, controlGetAnalyticsInputSchema.parse(input)),
    listUsers: (input) =>
      listAdminUsersReadModel(dependencies, controlListUsersInputSchema.parse(input)),
    getIntegrations: async (input) => {
      controlGetIntegrationsInputSchema.parse(input ?? {});
      return getAdminIntegrationsReadModel(dependencies);
    },
    listAudit: (input) =>
      listAdminAuditReadModel(dependencies.db, controlListAuditInputSchema.parse(input)),
    getSystem: async (input) => {
      controlGetSystemInputSchema.parse(input ?? {});
      return getAdminSystemReadModel(dependencies);
    },
  };
}
