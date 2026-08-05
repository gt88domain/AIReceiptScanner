import { Hono } from "hono";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import { registerAuthRoutes } from "./register-auth-routes";
import { registerBillingRoutes } from "./register-billing-routes";
import { registerCoreRoutes } from "./register-core-routes";
import { registerEmailRoutes } from "./register-email-routes";
import { registerRpcRoutes } from "./register-rpc-routes";
import { registerStorageRoutes } from "./register-storage-routes";
import type { ServerApp } from "./types";

/** Composes static platform route registrars; product modules stay behind the oRPC module extension point. */
export function createApp({ runtimeConfig }: { runtimeConfig: ServerRuntimeConfig }): ServerApp {
  const app = new Hono<{ Bindings: Cloudflare.Env }>();
  registerCoreRoutes(app, runtimeConfig);
  registerAuthRoutes(app, runtimeConfig);
  registerEmailRoutes(app, runtimeConfig);
  registerStorageRoutes(app, runtimeConfig);
  registerBillingRoutes(app, runtimeConfig);
  registerRpcRoutes(app, runtimeConfig);
  return app;
}
