import type { EmailService } from "../emails";
import type { Context } from "hono";
import { z } from "zod";
import { logSafeError } from "../lib/safe-error";
import {
  type PublicFormChallengeVerifier,
  verifyPublicFormChallenge,
} from "../security/public-form-challenge";
import { isRequestRateLimited } from "./request-rate-limit";

const contactInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(320),
  message: z.string().trim().min(10).max(5_000),
  turnstileToken: z.string().max(2_048).optional(),
  website: z.string().max(0).optional(),
});
const retryAfterMs = 60_000;

/** Builds a contact route with a server-only, fixed recipient. */
export function createContactHandler(
  emailService: EmailService,
  verifyChallenge: PublicFormChallengeVerifier = verifyPublicFormChallenge,
) {
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
    const challenge = await verifyChallenge({
      action: "contact",
      env: c.env,
      token: parsed.data.turnstileToken,
    });
    if (!challenge.ok) {
      return c.json({ error: challenge.error, code: challenge.code }, challenge.status);
    }
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
        subject: `[Contact] ${parsed.data.name.replace(/[\r\n]+/g, " ")}`,
        text: `From: ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
      });
    } catch (error) {
      const traceId = logSafeError("Contact message delivery failed", error);
      return c.json(
        {
          error: "Contact form is temporarily unavailable",
          code: "CONTACT_DELIVERY_FAILED",
          traceId,
        },
        502,
      );
    }
    return c.json({ sent: true });
  };
}
