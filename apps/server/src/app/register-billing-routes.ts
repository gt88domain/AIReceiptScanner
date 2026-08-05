import type { Context as HonoContext } from "hono";
import { bodyLimit } from "hono/body-limit";
import { createContext } from "../lib/context";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import type { ServerApp } from "./types";

function disabledWebhookResponse(c: HonoContext<{ Bindings: Cloudflare.Env }>, provider: string) {
  console.info(JSON.stringify({ event: "webhook_ignored", provider, reason: "billing_disabled" }));
  return c.body(null, 204);
}

/** Static billing boundary; physical billing omission remains a v0.4.5 concern. */
export function registerBillingRoutes(app: ServerApp, runtimeConfig: ServerRuntimeConfig) {
  app.use(
    "/api/webhooks/*",
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: (c) => c.json({ error: "Payload too large" }, 413),
    }),
  );
  for (const [path, provider, header] of [
    ["/api/webhooks/stripe", "stripe", "stripe-signature"],
    ["/api/webhooks/creem", "creem", "creem-signature"],
    ["/api/webhooks/waffo", "waffo", "x-waffo-signature"],
  ] as const) {
    app.post(path, async (c) => {
      if (!runtimeConfig.features.billing) return disabledWebhookResponse(c, provider);
      const context = await createContext({ context: c, runtimeConfig });
      await context.payments.handleWebhookEvent({
        provider,
        rawBody: await c.req.text(),
        signature: c.req.header(header),
      });
      return c.json({ received: true });
    });
  }
  app.post("/api/webhooks/revenuecat", async (c) => {
    if (!runtimeConfig.features.mobile || !runtimeConfig.features.native.billing) {
      return disabledWebhookResponse(c, "revenuecat");
    }
    const context = await createContext({ context: c, runtimeConfig });
    await context.payments.handleWebhookEvent({
      provider: "revenuecat",
      rawBody: await c.req.text(),
      signature: c.req.header("authorization"),
    });
    return c.json({ received: true });
  });
}
