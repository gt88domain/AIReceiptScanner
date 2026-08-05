import { handleAuthRequest } from "../auth/adapter";
import { authCorsMiddleware } from "../middlewares/cors";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import type { ServerApp } from "./types";

/** Keeps Better Auth HTTP, CORS, cookie, and callback behavior at one explicit boundary. */
export function registerAuthRoutes(app: ServerApp, runtimeConfig: ServerRuntimeConfig) {
  app.use("/api/auth/*", authCorsMiddleware);
  app.get("/email-verified", (c) =>
    c.html(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Email verified</title></head><body><main><h1>Email verified</h1><p>You can return to the app and sign in.</p></main></body></html>',
    ),
  );
  app.on(["POST", "GET"], "/api/auth/*", async (c) => {
    const request = new Request(new URL(c.req.url), {
      headers: new Headers(c.req.raw.headers),
      method: c.req.raw.method,
      body: c.req.raw.body,
    });
    const response = await handleAuthRequest(c.env.DB, request, runtimeConfig, c.env);
    return c.newResponse(response.body, response);
  });
}
