import type { EmailService } from "../emails";
import type { Context } from "hono";
import { z } from "zod";
import { isRequestRateLimited } from "./request-rate-limit";

const subscribeInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});
const retryAfterMs = 60_000;

/** Adds an address to the provider audience without exposing provider configuration. */
export function createNewsletterHandler(emailService: EmailService) {
  return async function subscribeNewsletter(c: Context) {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid request" }, 400);
    }
    const parsed = subscribeInputSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "Enter a valid email address" }, 400);
    if (isRequestRateLimited(c.req.raw, "newsletter", retryAfterMs)) {
      return c.json({ error: "Please wait a minute before trying again" }, 429, {
        "Retry-After": String(retryAfterMs / 1_000),
      });
    }
    try {
      await emailService.subscribeNewsletter(parsed.data.email);
    } catch (error) {
      console.error("Newsletter contact update failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return c.json({ error: "Newsletter is temporarily unavailable" }, 502);
    }
    return c.json({ subscribed: true });
  };
}
