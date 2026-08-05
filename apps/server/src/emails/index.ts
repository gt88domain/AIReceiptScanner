import type { ResolvedEmailConfig } from "@repo/app-config";
import { createResendEmailProvider } from "./providers/resend";
import type { EmailService } from "./types";

type EmailBindings = Pick<Cloudflare.Env, "RESEND_API_KEY" | "EMAIL_FROM">;

export type { EmailProvider, EmailService, SendEmailParams } from "./types";
export { sendResetPasswordEmailFromRequest } from "./senders/forgot-password-email";
export { sendVerificationEmailFromRequest } from "./senders/sign-up-verify-email";
export { sendSignInOtpEmailFromRequest } from "./senders/email-otp-email";

/** Creates a provider only after the explicit runtime email contract enables it. */
export function createEmailService(
  config: ResolvedEmailConfig,
  env: EmailBindings,
): EmailService | undefined {
  if (!config.enabled) return undefined;
  if (config.provider === "none") {
    throw new Error("[email:PROVIDER_MISSING] Enabled email requires a provider.");
  }
  if (config.provider === "resend") {
    if (!env.RESEND_API_KEY) {
      throw new Error("[email:PROVIDER_MISSING] RESEND_API_KEY is not configured.");
    }
    return createResendEmailProvider({
      apiKey: env.RESEND_API_KEY,
      defaultFrom: env.EMAIL_FROM || config.defaultFrom,
    });
  }
  throw new Error(`[email:PROVIDER_MISSING] Email provider not registered: ${config.provider}`);
}
