import { defaultLocale, type Locale } from "@repo/i18n";
import { createT } from "@/i18n";
import { resolveCommonConfig } from "@repo/app-config/config";
import SignUpVerifyEmail from "../templates/sign-up-verify-email";
import type { EmailService } from "../types";
import { withLocale } from "../locale";

function resolveEmailVerificationLink(verificationUrl: string): string {
  const url = new URL(verificationUrl);

  // Better Auth uses "/" when a native sign-up omits callbackURL. Keep the redirect HTTPS-only.
  if (url.searchParams.get("callbackURL") === "/") {
    url.searchParams.set("callbackURL", new URL("/email-verified", url.origin).toString());
  }

  return url.toString();
}

export async function sendVerificationEmail(
  emailService: EmailService,
  {
    to,
    name,
    verificationUrl,
    locale = defaultLocale,
  }: {
    to: string;
    name: string;
    verificationUrl: string;
    locale?: Locale;
  },
) {
  const t = createT(locale);
  const appName = resolveCommonConfig().app.name;

  await emailService.send({
    to,
    subject: t("email.verification.subject", { appName }),
    template: SignUpVerifyEmail({
      name,
      verificationUrl: resolveEmailVerificationLink(verificationUrl),
      appName,
      locale,
    }),
  });
}

export function sendVerificationEmailFromRequest(emailService: EmailService, request?: Request) {
  return withLocale<{ to: string; name: string; verificationUrl: string }>(request, (params) =>
    sendVerificationEmail(emailService, params),
  );
}
