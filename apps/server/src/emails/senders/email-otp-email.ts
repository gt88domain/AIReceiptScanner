import { resolveCommonConfig } from "@repo/app-config/config";
import { defaultLocale, type Locale } from "@repo/i18n";
import { createT } from "@/i18n";
import EmailOtpEmail from "../templates/email-otp-email";
import type { EmailService } from "../types";
import { withLocale } from "../locale";

export async function sendSignInOtpEmail(
  emailService: EmailService,
  {
    to,
    otp,
    locale = defaultLocale,
  }: {
    to: string;
    otp: string;
    locale?: Locale;
  },
) {
  const t = createT(locale);
  const commonConfig = resolveCommonConfig();
  const appName = commonConfig.app.name;
  const expiresInMinutes = Math.ceil(commonConfig.auth.otp.email.expiresInSeconds / 60);

  await emailService.send({
    to,
    subject: t("email.otp.subject", { appName }),
    template: EmailOtpEmail({
      appName,
      expiresInMinutes,
      locale,
      otp,
    }),
  });
}

export function sendSignInOtpEmailFromRequest(emailService: EmailService, request?: Request) {
  return withLocale<{ to: string; otp: string }>(request, (params) =>
    sendSignInOtpEmail(emailService, params),
  );
}
