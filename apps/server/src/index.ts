/**
 * TanStack Template API Server
 *
 * A Hono-based API server running on Cloudflare Workers with D1 database.
 *
 * Architecture Overview:
 * ----------------------
 * - Framework: Hono (lightweight web framework for edge)
 * - Database: Cloudflare D1 (SQLite-based)
 * - Auth: Better Auth with Drizzle adapter
 * - API: oRPC for type-safe RPC + REST API handlers
 *
 * Request Flow:
 * -------------
 * 1. Error handler catches all unhandled errors
 * 2. Logger middleware logs all requests
 * 3. i18n middleware detects locale and provides translation function
 * 4. CORS middleware applies appropriate headers based on route
 * 5. Route handlers process the request:
 *    - /api/auth/* -> Better Auth (authentication)
 *    - /rpc/*      -> oRPC handlers (type-safe RPC)
 *    - /api/*      -> REST API handlers
 *    - /           -> Health check
 *    - /session    -> Current session info
 *
 * Bindings:
 * ---------
 * - DB: D1Database - Cloudflare D1 database binding
 *
 * Environment Variables (via wrangler.jsonc or .dev.vars):
 * --------------------------------------------------------
 * - SERVER_URL: Base URL for auth callbacks
 * - BETTER_AUTH_SECRET: Secret for signing tokens
 * - WEBSITE_URL: Allowed origin for CORS
 * - GITHUB_CLIENT_ID/SECRET: GitHub OAuth credentials
 * - GOOGLE_CLIENT_ID/SECRET: Google OAuth credentials
 */

import { isNativePaymentsEnabled } from "@repo/app-config/payments/native";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { runCreditMaintenance } from "./credits";
import { createDb } from "./db";
import { apiHandler } from "./handlers/api";
import { subscribeNewsletter } from "./handlers/newsletter";
import { rpcHandler } from "./handlers/rpc";
import { handleFileServe } from "./handlers/storage";
import { createAuth } from "./lib/auth";
import { createContext } from "./lib/context";
import { authSessionMiddleware } from "./middlewares/auth";
import { apiCorsMiddleware, authCorsMiddleware } from "./middlewares/cors";
import { errorHandler } from "./middlewares/error";
import { i18nMiddleware } from "./middlewares/i18n";

const app = new Hono<{ Bindings: Cloudflare.Env }>();
// ============================================================================
// Global Middleware
// ============================================================================

/**
 * Global error handler - catches all unhandled errors and returns
 * appropriate error responses
 */
app.onError(errorHandler);

app.use(secureHeaders({ crossOriginResourcePolicy: false }));

/**
 * Request logger - keeps query parameters (which can contain auth tokens) out of logs.
 */
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

/**
 * i18n middleware - detects locale and provides translation function
 */
app.use(i18nMiddleware);

// ============================================================================
// CORS Configuration
// ============================================================================

/**
 * Auth endpoints need special CORS handling to support:
 * - Credentials (cookies)
 * - OAuth redirects
 */
app.use("/api/auth/*", authCorsMiddleware);

/**
 * Standard API CORS for regular endpoints
 */
app.use("/api/*", apiCorsMiddleware);
app.use("/rpc/*", apiCorsMiddleware);
app.post(
  "/api/newsletter/subscribe",
  bodyLimit({
    maxSize: 1024,
    onError: (c) => c.json({ error: "Payload too large" }, 413),
  }),
  subscribeNewsletter,
);
app.use(
  "/api/webhooks/*",
  bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => c.json({ error: "Payload too large" }, 413),
  }),
);

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Better Auth Handler
 *
 * Handles all authentication routes:
 * - POST /api/auth/sign-up - Email/password registration
 * - POST /api/auth/sign-in - Email/password login
 * - GET  /api/auth/callback/:provider - OAuth callbacks
 * - POST /api/auth/sign-out - Logout
 * - GET  /api/auth/session - Get current session
 *
 * Creates a new auth instance per request with the D1 database binding.
 */
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  // Better Auth may update request cookies internally, so pass mutable headers.
  const requestUrl = new URL(c.req.url);

  const request = new Request(requestUrl, {
    headers: new Headers(c.req.raw.headers),
    method: c.req.raw.method,
    body: c.req.raw.body,
  });
  const response = await createAuth(c.env.DB).handler(request);
  return c.newResponse(response.body, response);
});

/**
 * Stripe Webhook Endpoint
 *
 * POST /api/webhooks/stripe
 *
 * Receives Stripe webhook events and processes them with raw body validation.
 */
app.post("/api/webhooks/stripe", async (c) => {
  const context = await createContext({ context: c });
  const rawBody = await c.req.text();
  const signature = c.req.header("stripe-signature");

  await context.payments.handleWebhookEvent({
    provider: "stripe",
    rawBody,
    signature,
  });

  return c.json({ received: true });
});

/**
 * Creem Webhook Endpoint
 *
 * POST /api/webhooks/creem
 *
 * Receives Creem webhook events and validates the HMAC signature header.
 */
app.post("/api/webhooks/creem", async (c) => {
  const context = await createContext({ context: c });
  const rawBody = await c.req.text();
  const signature = c.req.header("creem-signature");

  await context.payments.handleWebhookEvent({
    provider: "creem",
    rawBody,
    signature,
  });

  return c.json({ received: true });
});

/**
 * Waffo Pancake Webhook Endpoint
 *
 * POST /api/webhooks/waffo
 *
 * Receives Waffo webhook events and validates the RSA signature header.
 */
app.post("/api/webhooks/waffo", async (c) => {
  const context = await createContext({ context: c });
  const rawBody = await c.req.text();
  const signature = c.req.header("x-waffo-signature");

  await context.payments.handleWebhookEvent({
    provider: "waffo",
    rawBody,
    signature,
  });

  return c.json({ received: true });
});

/**
 * RevenueCat Webhook Endpoint
 *
 * POST /api/webhooks/revenuecat
 *
 * Receives RevenueCat webhook events and validates the configured
 * Authorization header before dispatching to the payments service.
 */
app.post("/api/webhooks/revenuecat", async (c) => {
  if (!isNativePaymentsEnabled) {
    return c.json({ error: "not_found" }, 404);
  }

  const context = await createContext({ context: c });
  const rawBody = await c.req.text();
  const signature = c.req.header("authorization");

  await context.payments.handleWebhookEvent({
    provider: "revenuecat",
    signature,
    rawBody,
  });

  return c.json({ received: true });
});

/**
 * RPC and API handlers
 *
 * Uses createContext() to build request context including:
 * - session: Current user session (if authenticated)
 * - db: Drizzle database instance
 * - auth: Better Auth instance
 *
 * Request processing order:
 * Context creation is restricted to RPC/API routes so file delivery, health
 * checks, and auth callbacks do not pay for a session lookup and service setup.
 */
app.use("/rpc/*", async (c, next) => {
  const context = await createContext({ context: c });
  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });
  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  await next();
});

/**
 * Storage File Serve Endpoint
 *
 * GET /api/storage/*
 *
 * Serves files before the general OpenAPI handler so public downloads do not
 * need authentication context.
 */
app.get("/api/storage/*", handleFileServe);

app.use("/api/*", async (c, next) => {
  const context = await createContext({ context: c });
  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api",
    context,
  });
  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

/**
 * Health Check Endpoint
 *
 * GET /
 *
 * Returns server status for monitoring and load balancer health checks.
 * Response: { status: "ok", service: "tanstack-template API", version: "1.0.0", timestamp: ISO8601 }
 */
app.get("/", (c) =>
  c.json({
    status: "ok",
    service: "tanstack-template API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  }),
);

/**
 * Email verification always ends on HTTPS and never receives a session or native deep link.
 */
app.get("/email-verified", (c) =>
  c.html(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Email verified</title></head><body><main><h1>Email verified</h1><p>You can return to the app and sign in.</p></main></body></html>`,
  ),
);

/**
 * Session Endpoint
 *
 * GET /session
 *
 * Returns current authenticated user session.
 * - 401: Not authenticated
 * - 200: { user, session } object
 *
 * Useful for client-side session validation.
 */
app.use("/session", authSessionMiddleware);
app.get("/session", (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!user) return c.body(null, 401);

  return c.json({
    session,
    user,
  });
});

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
  async scheduled(_controller, env) {
    // Daily maintenance only expires eligible free credits; paid packages never expire.
    const db = createDb(env.DB);
    await runCreditMaintenance(db);
  },
} satisfies ExportedHandler<Cloudflare.Env>;
