import { apiHandler } from "../handlers/api";
import { rpcHandler } from "../handlers/rpc";
import { createContext } from "../lib/context";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import type { ServerApp } from "./types";

/** Mounts the stable oRPC/OpenAPI surface with the same immutable runtime contract per request. */
export function registerRpcRoutes(app: ServerApp, runtimeConfig: ServerRuntimeConfig) {
  app.use("/rpc/*", async (c, next) => {
    const context = await createContext({ context: c, runtimeConfig });
    const result = await rpcHandler.handle(c.req.raw, { prefix: "/rpc", context });
    if (result.matched) return c.newResponse(result.response.body, result.response);
    await next();
  });
  app.use("/api/*", async (c, next) => {
    const context = await createContext({ context: c, runtimeConfig });
    const result = await apiHandler.handle(c.req.raw, { prefix: "/api", context });
    if (result.matched) return c.newResponse(result.response.body, result.response);
    await next();
  });
}
