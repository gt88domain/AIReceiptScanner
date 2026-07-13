import { resolveWebCommonConfig } from "@repo/app-config";
import { trimTrailingSlash } from "@repo/shared";
import { getCurrentLocale } from "@/i18n";
import { defaultLocale } from "@/i18n/config";
import type { LandingPageComponentKey } from "./landing-page-component/landing-page-component-registry";
import type { ThemePresetKey } from "./theme-presets";
import { themePresets } from "./theme-presets";
import type { WebConfig, AuthUrls, BillingUrls } from "./types";

const commonConfig = resolveWebCommonConfig();
const webRoutes = commonConfig.routes;

const fallbackThemePresetKey = "clean-slate" as const satisfies ThemePresetKey;

const defaultThemePresetKey =
  (Object.keys(themePresets)[0] as ThemePresetKey | undefined) ?? fallbackThemePresetKey;

const defaultLandingPageComponents = [
  "hero-section-23",
  "tailark-logo-cloud",
  "features-section-21",
  "tailark-integrations",
  "tailark-content",
  "tailark-stats",
  "tailark-pricing",
  "tailark-faqs",
  "tailark-call-to-action",
  "tailark-testimonials",
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
  AppName: commonConfig.app.name,
  AppUrl: resolveAppUrl(),
  creditsEnabled: commonConfig.credits.enabled ?? false,
  storageEnabled: commonConfig.storage.enabled ?? false,
  auth: {
    methods: {
      emailPasswordEnabled: commonConfig.auth.methods.emailPasswordEnabled ?? false,
      emailOtpEnabled: commonConfig.auth.methods.emailOtpEnabled ?? false,
      smsEnabled: commonConfig.auth.methods.smsEnabled ?? false,
      githubEnabled: commonConfig.auth.methods.githubEnabled ?? false,
      googleEnabled: commonConfig.auth.methods.googleEnabled ?? false,
      appleEnabled: commonConfig.auth.methods.appleEnabled ?? false,
    },
    otp: {
      email: commonConfig.auth.otp.email,
      sms: commonConfig.auth.otp.sms,
    },
  },
  defaultThemePresetKey,
  defaultLandingPageComponents,
};

/**
 * Get auth callback URLs with locale prefix
 * URLs are generated dynamically to match current user's locale
 */
export function getAuthUrls(): AuthUrls {
  const localizedBaseUrl = getLocalizedBaseUrl();

  return {
    callbackURL: `${localizedBaseUrl}${webRoutes.authSignIn}`,
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
