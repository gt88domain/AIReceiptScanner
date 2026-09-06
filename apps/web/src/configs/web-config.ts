import { resolvePublicRuntimeConfig } from "@repo/app-config/public-runtime";
import { trimTrailingSlash } from "@repo/shared";
import { getCurrentLocale } from "@/i18n";
import { defaultLocale } from "@/i18n/config";
import type { WebConfig, AuthUrls, BillingUrls } from "./types";

const publicRuntime = resolvePublicRuntimeConfig();
const webRoutes = publicRuntime.routes;

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
  ticketsEnabled: publicRuntime.features.tickets,
  storageEnabled: publicRuntime.features.storage,
  newsletterEnabled: publicRuntime.features.newsletter,
  contactFormEnabled: publicRuntime.features.contactForm,
  docsEnabled: import.meta.env.VITE_CONTENT_DOCS_ENABLED === "true",
  blogEnabled: import.meta.env.VITE_CONTENT_BLOG_ENABLED === "true",
  docsPublic: import.meta.env.VITE_CONTENT_DOCS_PUBLIC === "true",
  blogPublic: import.meta.env.VITE_CONTENT_BLOG_PUBLIC === "true",
  auth: {
    publicSignupEnabled: publicRuntime.auth.publicSignupEnabled,
    methods: {
      emailPasswordEnabled: publicRuntime.auth.methods.emailPassword,
      githubEnabled: publicRuntime.auth.methods.github,
      googleEnabled: publicRuntime.auth.methods.google,
      appleEnabled: publicRuntime.auth.methods.apple,
    },
  },
  defaultThemePresetKey: publicRuntime.defaultThemePresetKey,
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
