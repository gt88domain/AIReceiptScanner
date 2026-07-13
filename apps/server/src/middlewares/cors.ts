import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { trimTrailingSlash } from "@repo/shared";

// CORS middleware for auth endpoints
export const authCorsMiddleware: MiddlewareHandler = (c, next) => {
  const env = c.env as Record<string, string>;
  const corsMiddleware = cors({
    origin: trimTrailingSlash(env.WEBSITE_URL ?? "") || "*",
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Set-Cookie"],
    maxAge: 600,
    credentials: true,
  });
  return corsMiddleware(c, next);
};

// CORS middleware for API and RPC endpoints
export const apiCorsMiddleware: MiddlewareHandler = (c, next) => {
  const env = c.env as Record<string, string>;
  const corsMiddleware = cors({
    origin: trimTrailingSlash(env.WEBSITE_URL ?? "") || "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
  return corsMiddleware(c, next);
};
