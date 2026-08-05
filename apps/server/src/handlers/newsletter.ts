import type { EmailService } from "../emails";
import type { Context } from "hono";
import { z } from "zod";
import { logSafeError } from "../lib/safe-error";
import {
  type PublicFormChallengeVerifier,
  verifyPublicFormChallenge,
} from "../security/public-form-challenge";
import { isRequestRateLimited } from "./request-rate-limit";

const subscribeInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  turnstileToken: z.string().max(2_048).optional(),
});
const retryAfterMs = 60_000;

/** Adds an address to the provider audience without exposing provider configuration. */
export function createNewsletterHandler(
  emailService: EmailService,
  verifyChallenge: PublicFormChallengeVerifier = verifyPublicFormChallenge,
) {
  return async function subscribeNewsletter(c: Context<{ Bindings: Cloudflare.Env }>) {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid request" }, 400);
    }
    const parsed = subscribeInputSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "Enter a valid email address" }, 400);
    const challenge = await verifyChallenge({
      action: "newsletter",
      env: c.env,
      token: parsed.data.turnstileToken,
    });
    if (!challenge.ok) {
      return c.json({ error: challenge.error, code: challenge.code }, challenge.status);
    }
    if (isRequestRateLimited(c.req.raw, "newsletter", retryAfterMs)) {
      return c.json({ error: "Please wait a minute before trying again" }, 429, {
        "Retry-After": String(retryAfterMs / 1_000),
      });
    }
    try {
      await emailService.subscribeNewsletter(parsed.data.email);
    } catch (error) {
      const traceId = logSafeError("Newsletter contact update failed", error);
      return c.json(
        {
          error: "Newsletter is temporarily unavailable",
          code: "NEWSLETTER_DELIVERY_FAILED",
          traceId,
        },
        502,
      );
    }
    return c.json({ subscribed: true });
  };
}
