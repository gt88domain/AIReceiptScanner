import { resolveNativeCommonConfig } from "@repo/app-config";
import { createURL } from "expo-linking";
import { type AppConfig, type AuthConfig } from "./types";

const commonConfig = resolveNativeCommonConfig();
const nativeRoutes = commonConfig.routes;

function createDeepLinkURL(scheme: string, path: string) {
  const normalizedPath = path.replace(/^\/+/, "");
  return createURL(normalizedPath, { scheme });
}

export const appConfig: AppConfig = {
  appName: commonConfig.app.name,
  supportEmail: commonConfig.app.supportEmail,
  websiteUrl: commonConfig.app.websiteUrl,
  socialUrl: commonConfig.app.socialUrl,
  appStoreUrl: commonConfig.app.appStoreUrl,
  storagePrefix: commonConfig.app.name,
  themePreferenceStorageKey: `${commonConfig.app.name}_theme_preference`,
  themeFamilyStorageKey: `${commonConfig.app.name}_theme_family`,
  onboardingCompletedStorageKey: `${commonConfig.app.name}_onboarding_completed`,
  creditsEnabled: commonConfig.credits.enabled ?? false,
  storageEnabled: commonConfig.storage.enabled ?? false,
  auth: {
    methods: {
      emailPasswordEnabled: commonConfig.auth.methods.emailPasswordEnabled ?? false,
      githubEnabled: commonConfig.auth.methods.githubEnabled ?? false,
      googleEnabled: commonConfig.auth.methods.googleEnabled ?? false,
      appleEnabled: commonConfig.auth.methods.appleEnabled ?? false,
    },
  },
  safeAreaTop: 80,
  safeAreaBottom: 20,
  keyboardBottomOffset: 80,
};

export function getAuthConfig(): AuthConfig {
  const storagePrefix = commonConfig.app.name;
  const scheme = commonConfig.app.nativeScheme;

  return {
    scheme,
    storagePrefix,
    cookieStorageKey: `${storagePrefix}_cookie`,
    callbackURL: createDeepLinkURL(scheme, nativeRoutes.authSignIn),
    resetPasswordURL: createDeepLinkURL(scheme, nativeRoutes.resetPassword),
  };
}
