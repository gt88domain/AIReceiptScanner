import { resolveCommonConfig, resolveNativeCommonConfig } from "@repo/app-config/config";
import { defaultLocale, type Locale } from "@repo/i18n";
import { createT } from "@/i18n";
import SignUpVerifyEmail from "../templates/sign-up-verify-email";
import { sendEmail, withLocale } from "./send-email";

const nativeCallbackScheme = `${resolveNativeCommonConfig().app.name}://`;

// Detect whether callback points to the native custom scheme.
function isNativeCallbackURL(callbackURL: string | null): callbackURL is string {
  return Boolean(callbackURL?.startsWith(nativeCallbackScheme));
}

// Web verification keeps Better Auth's original verify-email URL.
function resolveWebEmailVerificationLink(verificationUrl: string): string {
  return verificationUrl;
}

// Native verification goes through server bridge to convert Set-Cookie into a callback query param.
function resolveNativeEmailVerificationLink(verificationUrl: string, callbackURL: string): string {
  const url = new URL(verificationUrl);
  const token = url.searchParams.get("token");
  if (!token) {
    throw new Error("Missing token in verification URL");
  }

  const bridgeUrl = new URL("/api/auth/verify-email/native", url.origin);
  bridgeUrl.searchParams.set("token", token);
  bridgeUrl.searchParams.set("callbackURL", callbackURL);
  return bridgeUrl.toString();
}

// Route to web/native verification link builder based on callback target.
function resolveEmailVerificationLink(verificationUrl: string): string {
  const url = new URL(verificationUrl);
  const callbackURL = url.searchParams.get("callbackURL");

  if (isNativeCallbackURL(callbackURL)) {
    return resolveNativeEmailVerificationLink(verificationUrl, callbackURL);
  }

  return resolveWebEmailVerificationLink(verificationUrl);
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
  const emailVerificationLink = resolveEmailVerificationLink(verificationUrl);

  await sendEmail({
    to,
    subject: t("email.verification.subject", { appName }),
    template: SignUpVerifyEmail({ name, verificationUrl: emailVerificationLink, appName, locale }),
  });
}

export function sendVerificationEmailFromRequest(request?: Request) {
  return withLocale(request, sendVerificationEmail);
}
