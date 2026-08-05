import type { EmailService } from "../emails";
import type { Context } from "hono";
import { z } from "zod";
import { isRequestRateLimited } from "./request-rate-limit";

const contactInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(320),
  message: z.string().trim().min(10).max(5_000),
  website: z.string().max(0).optional(),
});
const retryAfterMs = 60_000;

/** Builds a contact route with a server-only, fixed recipient. */
export function createContactHandler(emailService: EmailService) {
  return async function sendContactMessage(c: Context<{ Bindings: Cloudflare.Env }>) {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid request" }, 400);
    }
    const parsed = contactInputSchema.safeParse(body);
    if (!parsed.success)
      return c.json({ error: "Check the contact form fields and try again" }, 400);
    if (isRequestRateLimited(c.req.raw, "contact", retryAfterMs)) {
      return c.json({ error: "Please wait a minute before trying again" }, 429, {
        "Retry-After": String(retryAfterMs / 1_000),
      });
    }
    const recipient = c.env.CONTACT_RECIPIENT;
    if (!recipient) return c.json({ error: "Contact form is temporarily unavailable" }, 503);
    try {
      await emailService.send({
        to: recipient,
        subject: `[Contact] ${parsed.data.name}`,
        text: `From: ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
      });
    } catch (error) {
      console.error("Contact message delivery failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return c.json({ error: "Contact form is temporarily unavailable" }, 502);
    }
    return c.json({ sent: true });
  };
}
