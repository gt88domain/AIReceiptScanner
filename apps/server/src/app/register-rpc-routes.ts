import { bodyLimit } from "hono/body-limit";
import type { Context } from "hono";
import { createApiHandler } from "../handlers/api";
import { createRpcHandler } from "../handlers/rpc";
import { createContext } from "../lib/context";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import { buildRuntimeAppRouter } from "../routers/runtime-router";
import type { ServerApp } from "./types";

const defaultMaxRequestBodySize = 1024 * 1024;
const multipartOverhead = 1024 * 1024;

function resolveMaxRequestBodySize(runtimeConfig: ServerRuntimeConfig) {
  if (!runtimeConfig.storage.enabled) return defaultMaxRequestBodySize;
  return Math.max(...Object.values(runtimeConfig.storage.maxFileSizes)) + multipartOverhead;
}

function payloadTooLarge(c: Context<{ Bindings: Cloudflare.Env }>) {
  return c.json({ error: "Payload too large", code: "PAYLOAD_TOO_LARGE" }, 413);
}

/** Mounts the physically composed Worker API surface with the same contract per request. */
export function registerRpcRoutes(app: ServerApp, runtimeConfig: ServerRuntimeConfig) {
  const router = buildRuntimeAppRouter(runtimeConfig.composition);
  const rpcHandler = createRpcHandler(router);
  const apiHandler = createApiHandler(router);
  const maxSize = resolveMaxRequestBodySize(runtimeConfig);

  // Specific /api routes are registered before this boundary and retain their own limits.
  app.use("/rpc/*", bodyLimit({ maxSize, onError: payloadTooLarge }));
  app.use("/rpc/*", async (c, next) => {
    const context = await createContext({ context: c, runtimeConfig });
    const result = await rpcHandler.handle(c.req.raw, { prefix: "/rpc", context });
    if (result.matched) return c.newResponse(result.response.body, result.response);
    await next();
  });
  app.use("/api/*", bodyLimit({ maxSize, onError: payloadTooLarge }));
  app.use("/api/*", async (c, next) => {
    const context = await createContext({ context: c, runtimeConfig });
    const result = await apiHandler.handle(c.req.raw, { prefix: "/api", context });
    if (result.matched) return c.newResponse(result.response.body, result.response);
    await next();
  });
}
