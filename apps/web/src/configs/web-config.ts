import { resolvePublicRuntimeConfig } from "@repo/app-config/public-runtime";
import { trimTrailingSlash } from "@repo/shared";
import { getCurrentLocale } from "@/i18n";
import { defaultLocale } from "@/i18n/config";
import type { LandingPageComponentKey } from "./landing-page-component/landing-page-component-registry";
import type { WebConfig, AuthUrls, BillingUrls } from "./types";

const publicRuntime = resolvePublicRuntimeConfig();
const webRoutes = publicRuntime.routes;

const defaultLandingPageComponents = [
  "hero-section-23",
  "features-section-21",
  "tailark-content",
  "tailark-faqs",
  "tailark-call-to-action",
] as const satisfies readonly LandingPageComponentKey[];

function resolveAppUrl(): string {
  const configuredAppUrl = import.meta.env.VITE_APP_URL;
  if (configuredAppUrl) {
    return configuredAppUrl;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

function getLocalePrefix(locale: string): string {
  return locale === defaultLocale ? "" : `/${locale}`;
}

function getLocalizedBaseUrl(): string {
  const locale = getCurrentLocale();
  const appUrl = resolveAppUrl();
  return `${trimTrailingSlash(appUrl)}${getLocalePrefix(locale)}`;
}

export const webConfig: WebConfig = {
  AppName: publicRuntime.appName,
  AppUrl: resolveAppUrl(),
  supportEmail: publicRuntime.supportEmail,
  adminEnabled: publicRuntime.features.admin,
  billingEnabled: publicRuntime.features.billing,
  creditsEnabled: publicRuntime.features.credits,
  creditPurchasesEnabled: publicRuntime.features.creditPurchases,
  storageEnabled: publicRuntime.features.storage,
  auth: {
    methods: {
      emailPasswordEnabled: publicRuntime.auth.methods.emailPassword,
      emailOtpEnabled: publicRuntime.auth.methods.emailOtp,
      githubEnabled: publicRuntime.auth.methods.github,
      googleEnabled: publicRuntime.auth.methods.google,
      appleEnabled: publicRuntime.auth.methods.apple,
    },
    otp: {
      email: publicRuntime.auth.emailOtp,
    },
  },
  defaultThemePresetKey: publicRuntime.defaultThemePresetKey,
  defaultLandingPageComponents,
};

/**
 * Get auth callback URLs with locale prefix
 * URLs are generated dynamically to match current user's locale
 */
export function getAuthUrls(): AuthUrls {
  const localizedBaseUrl = getLocalizedBaseUrl();

  return {
    callbackURL: `${localizedBaseUrl}/dashboard`,
    errorCallbackURL: `${localizedBaseUrl}${webRoutes.authSignIn}`,
    resetPasswordCallbackURL: `${localizedBaseUrl}${webRoutes.authResetPassword}`,
  };
}

/**
 * Get billing URLs with locale prefix
 * URLs are generated dynamically to match current user's locale
 */
export function getBillingUrls(): BillingUrls {
  const localizedBaseUrl = getLocalizedBaseUrl();

  return {
    successURL: `${localizedBaseUrl}${webRoutes.billingSuccess}`,
    cancelURL: `${localizedBaseUrl}${webRoutes.billingCancel}`,
    returnURL: `${localizedBaseUrl}${webRoutes.billingReturn}`,
  };
}
