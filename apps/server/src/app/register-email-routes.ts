import { bodyLimit } from "hono/body-limit";
import { createEmailService } from "../emails";
import { createContactHandler } from "../handlers/contact";
import { createNewsletterHandler } from "../handlers/newsletter";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import type { ServerApp } from "./types";
import { isBackofficePreview } from "../lib/backoffice-preview";

/** Registers public email routes only for explicitly enabled capabilities. */
export function registerEmailRoutes(app: ServerApp, runtimeConfig: ServerRuntimeConfig) {
  if (!runtimeConfig.email.enabled) return;
  if (runtimeConfig.email.capabilities.newsletter) {
    app.post(
      "/api/newsletter/subscribe",
      bodyLimit({ maxSize: 4 * 1024, onError: (c) => c.json({ error: "Payload too large" }, 413) }),
      (c) => {
        if (isBackofficePreview(c.env)) {
          return c.json({ error: "Email is disabled in Backoffice preview." }, 503);
        }
        const email = createEmailService(runtimeConfig.email, c.env);
        if (!email) return c.notFound();
        return createNewsletterHandler(email)(c);
      },
    );
  }
  if (runtimeConfig.email.capabilities.contactForm) {
    app.post(
      "/api/contact",
      bodyLimit({
        maxSize: 16 * 1024,
        onError: (c) => c.json({ error: "Payload too large" }, 413),
      }),
      (c) => {
        if (isBackofficePreview(c.env)) {
          return c.json({ error: "Email is disabled in Backoffice preview." }, 503);
        }
        const email = createEmailService(runtimeConfig.email, c.env);
        if (!email) return c.notFound();
        return createContactHandler(email)(c);
      },
    );
  }
}
