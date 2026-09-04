import { render } from "@react-email/render";
import { type CreateEmailOptions, Resend } from "resend";
import { logSafeError } from "../../lib/safe-error";
import type { EmailService, SendEmailParams } from "../types";

/**
 * Resend email provider factory
 */
export function createResendEmailProvider({
  apiKey,
  defaultFrom,
}: {
  apiKey: string;
  defaultFrom?: string;
}): EmailService {
  const client = new Resend(apiKey);

  return {
    key: "resend",
    async send({ from, to, subject, html, text, template }: SendEmailParams) {
      const resolvedFrom = from ?? defaultFrom;
      if (!resolvedFrom) {
        throw new Error("Email service is not configured with a from address");
      }

      const renderedHtml = template ? await render(template) : html;
      const renderedText = text ?? (template ? await render(template, { plainText: true }) : undefined);
      if (!renderedHtml && !renderedText) {
        throw new Error("Email content is missing");
      }

      const base = { from: resolvedFrom, to, subject };

      const payload: CreateEmailOptions = renderedHtml
        ? ({ ...base, html: renderedHtml, text: renderedText } as CreateEmailOptions)
        : ({ ...base, text: renderedText ?? "" } as CreateEmailOptions);

      const { error } = await client.emails.send(payload);

      if (error) {
        logSafeError("Resend email delivery failed", error);
        throw new Error("Email delivery failed");
      }
    },
    async subscribeNewsletter(email) {
      const existing = await client.contacts.get({ email });
      if (existing.error && existing.error.statusCode !== 404) {
        throw new Error("Newsletter contact lookup failed");
      }
      // Existing contacts may have opted out; public signup must never override that consent.
      if (existing.data) return;
      const result = await client.contacts.create({ email, unsubscribed: false });
      if (result.error) throw new Error("Newsletter contact update failed");
    },
  };
}
