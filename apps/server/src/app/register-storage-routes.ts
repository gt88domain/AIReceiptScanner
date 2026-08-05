import { handleFileServe } from "../handlers/storage";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import type { ServerApp } from "./types";

/** Storage is physically absent from HTTP routing when disabled. */
export function registerStorageRoutes(app: ServerApp, runtimeConfig: ServerRuntimeConfig) {
  if (!runtimeConfig.features.storage) return;
  app.get("/api/storage/*", (c) => handleFileServe(c, runtimeConfig));
}
