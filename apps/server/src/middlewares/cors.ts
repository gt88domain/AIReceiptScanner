import type { Context, MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { trimTrailingSlash } from "@repo/shared";

function configuredOrigin(origin: string, c: Context): string | undefined {
  const allowedOrigin = trimTrailingSlash((c.env as Record<string, string>).WEBSITE_URL ?? "");
  return allowedOrigin && origin === allowedOrigin ? allowedOrigin : undefined;
}

// CORS middleware for auth endpoints
export const authCorsMiddleware: MiddlewareHandler = cors({
  origin: configuredOrigin,
  allowHeaders: ["Content-Type", "Authorization", "Cookie"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  exposeHeaders: ["Content-Length", "Set-Cookie"],
  maxAge: 600,
  credentials: true,
});

// CORS middleware for API and RPC endpoints
export const apiCorsMiddleware: MiddlewareHandler = cors({
  origin: configuredOrigin,
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});
