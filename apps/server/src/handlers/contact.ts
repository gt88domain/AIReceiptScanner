import { resolveCommonConfig } from "@repo/app-config/config";
import type { Context } from "hono";
import { z } from "zod";
import { sendEmail } from "../emails/senders/send-email";
import { isRequestRateLimited } from "./request-rate-limit";

const contactInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(320),
  message: z.string().trim().min(10).max(5_000),
  website: z.string().max(0).optional(),
});
const retryAfterMs = 60_000;

/** Sends a public contact request to the configured support inbox. */
export async function sendContactMessage(c: Context<{ Bindings: Cloudflare.Env }>) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }

  const parsed = contactInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Check the contact form fields and try again" }, 400);
  }
  if (isRequestRateLimited(c.req.raw, "contact", retryAfterMs)) {
    return c.json({ error: "Please wait a minute before trying again" }, 429, {
      "Retry-After": String(retryAfterMs / 1_000),
    });
  }

  const config = resolveCommonConfig();
  try {
    await sendEmail({
      to: config.app.supportEmail,
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
}
