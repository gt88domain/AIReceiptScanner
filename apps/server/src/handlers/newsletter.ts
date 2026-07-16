import type { Context } from "hono";
import { Resend } from "resend";
import { z } from "zod";
import { getClientIp } from "@repo/shared";

const subscribeInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});

const retryAfterMs = 60_000;
const recentAttempts = new Map<string, number>();

function isRateLimited(request: Request): boolean {
  const clientIp = getClientIp(request.headers);
  if (!clientIp) return false;

  const now = Date.now();
  const previousAttempt = recentAttempts.get(clientIp);
  if (previousAttempt && now - previousAttempt < retryAfterMs) return true;

  recentAttempts.set(clientIp, now);

  // ponytail: this is per Worker isolate, so use a Cloudflare WAF rate-limit rule for global abuse control.
  if (recentAttempts.size > 5_000) {
    for (const [ip, attemptedAt] of recentAttempts) {
      if (now - attemptedAt >= retryAfterMs) recentAttempts.delete(ip);
    }
  }

  return false;
}

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

  if (isRateLimited(c.req.raw)) {
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
