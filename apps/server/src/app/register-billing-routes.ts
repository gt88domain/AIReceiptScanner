import { bodyLimit } from "hono/body-limit";
import { resolveCurrentConfiguredPaymentProviders } from "@repo/app-config";
import { createContext } from "../lib/context";
import { requirePaymentService } from "../lib/payment-access";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import type { ServerApp } from "./types";

/** Registers only active payment-provider webhooks; disabled Billing has no HTTP surface. */
export function registerBillingRoutes(app: ServerApp, runtimeConfig: ServerRuntimeConfig) {
  if (!runtimeConfig.composition.modules.billing) return;
  const providers = new Set(resolveCurrentConfiguredPaymentProviders(runtimeConfig.features));
  app.use(
    "/api/webhooks/*",
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: (c) => c.json({ error: "Payload too large" }, 413),
    }),
  );
  for (const [path, provider, header] of [
    ["/api/webhooks/stripe", "stripe", "stripe-signature"],
  ] as const) {
    if (!providers.has(provider)) continue;
    app.post(path, async (c) => {
      const context = await createContext({ context: c, runtimeConfig });
      await requirePaymentService(context).handleWebhookEvent({
        provider,
        rawBody: await c.req.text(),
        signature: c.req.header(header),
      });
      return c.json({ received: true });
    });
  }
  if (providers.has("revenuecat"))
    app.post("/api/webhooks/revenuecat", async (c) => {
      const context = await createContext({ context: c, runtimeConfig });
      await requirePaymentService(context).handleWebhookEvent({
        provider: "revenuecat",
        rawBody: await c.req.text(),
        signature: c.req.header("authorization"),
      });
      return c.json({ received: true });
    });
}
