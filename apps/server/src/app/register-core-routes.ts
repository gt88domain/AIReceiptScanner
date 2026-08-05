import { resolveCommonConfig } from "@repo/app-config";
import { secureHeaders } from "hono/secure-headers";
import templateVersion from "../../../../template-version.json";
import { createAuthSessionMiddleware } from "../middlewares/auth";
import { apiCorsMiddleware } from "../middlewares/cors";
import { errorHandler } from "../middlewares/error";
import { i18nMiddleware } from "../middlewares/i18n";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import type { ServerApp } from "./types";

/** Registers shared HTTP safety, health, session, and API CORS surfaces only. */
export function registerCoreRoutes(app: ServerApp, runtimeConfig: ServerRuntimeConfig) {
  const appName = resolveCommonConfig().app.name;
  app.onError(errorHandler);
  app.use(secureHeaders({ crossOriginResourcePolicy: false }));
  app.use(async (c, next) => {
    const start = Date.now();
    try {
      await next();
    } finally {
      console.info(
        JSON.stringify({
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          durationMs: Date.now() - start,
        }),
      );
    }
  });
  app.use(i18nMiddleware);
  app.use("/api/*", apiCorsMiddleware);
  app.use("/rpc/*", apiCorsMiddleware);

  app.get("/", (c) =>
    c.json({
      status: "ok",
      service: appName,
      version: templateVersion.version,
      templateVersion: templateVersion.version,
      environment: c.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    }),
  );
  app.use("/session", createAuthSessionMiddleware(runtimeConfig));
  app.get("/session", (c) => {
    const session = c.get("session");
    const user = c.get("user");
    if (!user) return c.body(null, 401);
    return c.json({ session, user });
  });
}
