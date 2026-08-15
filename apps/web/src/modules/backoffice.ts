export type BackofficeModuleFeature = "billing" | "credits" | "tickets";

type BackofficeModuleEntry = {
  titleKey: string;
  routeId: string;
};

export type BackofficeModule = {
  id: string;
  userApp?: BackofficeModuleEntry;
  adminModule?: BackofficeModuleEntry;
  requiresFeature?: BackofficeModuleFeature;
};

type BackofficeFeatures = Record<BackofficeModuleFeature, boolean>;

export type ResolvedBackofficeModules = {
  userApps: Array<BackofficeModuleEntry & { id: string }>;
  adminModules: Array<BackofficeModuleEntry & { id: string }>;
};

/** Resolves trusted, build-time module declarations into stable navigation entries. */
export function resolveBackofficeModules(
  manifests: readonly BackofficeModule[],
  features: BackofficeFeatures,
): ResolvedBackofficeModules {
  const ids = new Set<string>();
  const resolved = [...manifests]
    .sort((left, right) => left.id.localeCompare(right.id))
    .filter((manifest) => {
      if (ids.has(manifest.id)) {
        throw new Error(`Duplicate backoffice module id: ${manifest.id}`);
      }
      ids.add(manifest.id);
      return !manifest.requiresFeature || features[manifest.requiresFeature];
    });

  return {
    userApps: resolved.flatMap((manifest) =>
      manifest.userApp ? [{ id: manifest.id, ...manifest.userApp }] : [],
    ),
    adminModules: resolved.flatMap((manifest) =>
      manifest.adminModule ? [{ id: manifest.id, ...manifest.adminModule }] : [],
    ),
  };
}
