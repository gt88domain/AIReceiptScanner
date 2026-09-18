import { Hono } from "hono";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import { registerAuthRoutes } from "./register-auth-routes";
import { registerBillingRoutes } from "./register-billing-routes";
import { registerCoreRoutes } from "./register-core-routes";
import { registerEmailRoutes } from "./register-email-routes";
import {
  registerPublicReadRoutes,
  type PublicReadRouteRegistrar,
} from "./register-public-read-routes";
import { registerRpcRoutes } from "./register-rpc-routes";
import { registerStorageRoutes } from "./register-storage-routes";
import type { ServerApp } from "./types";

export type CreateAppOptions = {
  runtimeConfig: ServerRuntimeConfig;
  publicReadRouteRegistrars?: readonly PublicReadRouteRegistrar[];
};

const emptyPublicReadRouteRegistrars: readonly PublicReadRouteRegistrar[] = [];

/** Composes static platform routes and explicit public-read registrars without importing product modules. */
export function createApp({
  runtimeConfig,
  publicReadRouteRegistrars = emptyPublicReadRouteRegistrars,
}: CreateAppOptions): ServerApp {
  const app = new Hono<{ Bindings: Cloudflare.Env }>();
  registerCoreRoutes(app, runtimeConfig);
  registerAuthRoutes(app, runtimeConfig);
  registerEmailRoutes(app, runtimeConfig);
  registerStorageRoutes(app, runtimeConfig);
  registerBillingRoutes(app, runtimeConfig);
  registerPublicReadRoutes(app, publicReadRouteRegistrars);
  registerRpcRoutes(app, runtimeConfig);
  return app;
}
