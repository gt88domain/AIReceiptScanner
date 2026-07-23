import type { Context } from "hono";
import { Resend } from "resend";
import { z } from "zod";
import { isRequestRateLimited } from "./request-rate-limit";

const subscribeInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});

const retryAfterMs = 60_000;

/** Adds an email to Resend's global Contacts list without exposing its API key to the browser. */
export async function subscribeNewsletter(c: Context<{ Bindings: Cloudflare.Env }>) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }

  const parsed = subscribeInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Enter a valid email address" }, 400);
  }

  if (isRequestRateLimited(c.req.raw, "newsletter", retryAfterMs)) {
    return c.json({ error: "Please wait a minute before trying again" }, 429, {
      "Retry-After": String(retryAfterMs / 1_000),
    });
  }

  if (!c.env.RESEND_API_KEY) {
    return c.json({ error: "Newsletter is not configured" }, 503);
  }

  const resend = new Resend(c.env.RESEND_API_KEY);
  const { email } = parsed.data;
  const existing = await resend.contacts.get({ email });

  if (existing.error && existing.error.statusCode !== 404) {
    console.error("Newsletter contact lookup failed", { name: existing.error.name });
    return c.json({ error: "Newsletter is temporarily unavailable" }, 502);
  }

  const result = existing.data
    ? await resend.contacts.update({ email, unsubscribed: false })
    : await resend.contacts.create({ email, unsubscribed: false });

  if (result.error) {
    console.error("Newsletter contact update failed", { name: result.error.name });
    return c.json({ error: "Newsletter is temporarily unavailable" }, 502);
  }

  return c.json({ subscribed: true });
}
