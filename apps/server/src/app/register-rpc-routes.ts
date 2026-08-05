import { createApiHandler } from "../handlers/api";
import { createRpcHandler } from "../handlers/rpc";
import { createContext } from "../lib/context";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import { buildRuntimeAppRouter } from "../routers/runtime-router";
import type { ServerApp } from "./types";

/** Mounts the physically composed Worker API surface with the same contract per request. */
export function registerRpcRoutes(app: ServerApp, runtimeConfig: ServerRuntimeConfig) {
  const router = buildRuntimeAppRouter(runtimeConfig.composition);
  const rpcHandler = createRpcHandler(router);
  const apiHandler = createApiHandler(router);

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
