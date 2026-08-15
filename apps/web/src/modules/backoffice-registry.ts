import type { BackofficeModule } from "./backoffice";

const discoveredModules = import.meta.glob<BackofficeModule>("./*/backoffice.ts", {
  eager: true,
  import: "backoffice",
});

/** Product modules are discovered at build time; the upstream template has none by default. */
export const registeredBackofficeModules = Object.values(discoveredModules);
