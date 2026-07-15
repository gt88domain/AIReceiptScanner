import { defaultLocale, type Locale } from "@repo/i18n";
import { createT } from "@/i18n";
import { resolveCommonConfig } from "@repo/app-config/config";
import SignUpVerifyEmail from "../templates/sign-up-verify-email";
import { sendEmail, withLocale } from "./send-email";

function resolveEmailVerificationLink(verificationUrl: string): string {
  const url = new URL(verificationUrl);

  // Better Auth uses "/" when a native sign-up omits callbackURL. Keep the redirect HTTPS-only.
  if (url.searchParams.get("callbackURL") === "/") {
    url.searchParams.set("callbackURL", new URL("/email-verified", url.origin).toString());
  }

  return url.toString();
}

export async function sendVerificationEmail({
  to,
  name,
  verificationUrl,
  locale = defaultLocale,
}: {
  to: string;
  name: string;
  verificationUrl: string;
  locale?: Locale;
}) {
  const t = createT(locale);
  const appName = resolveCommonConfig().app.name;

  await sendEmail({
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

export function sendVerificationEmailFromRequest(request?: Request) {
  return withLocale(request, sendVerificationEmail);
}
