import { resolveCommonConfig } from "@repo/app-config/config";
import { defaultLocale, type Locale } from "@repo/i18n";
import { createT } from "@/i18n";
import ForgotPasswordEmail from "../templates/forgot-password-email";
import type { EmailService } from "../types";
import { withLocale } from "../locale";

export async function sendResetPasswordEmail(
  emailService: EmailService,
  {
    to,
    name,
    resetUrl,
    locale = defaultLocale,
  }: {
    to: string;
    name: string;
    resetUrl: string;
    locale?: Locale;
  },
) {
  const t = createT(locale);
  const appName = resolveCommonConfig().app.name;

  await emailService.send({
    to,
    subject: t("email.passwordReset.subject", { appName }),
    template: ForgotPasswordEmail({ name, resetUrl, appName, locale }),
  });
}

export function sendResetPasswordEmailFromRequest(emailService: EmailService, request?: Request) {
  return withLocale<{ to: string; name: string; resetUrl: string }>(request, (params) =>
    sendResetPasswordEmail(emailService, params),
  );
}
