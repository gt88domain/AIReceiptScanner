import type { AppCommonConfig } from "@repo/app-config";

export interface AppConfig {
  appName: string;
  supportEmail: string;
  websiteUrl: string;
  socialUrl: string;
  appStoreUrl: string;
  storagePrefix: string;
  themePreferenceStorageKey: string;
  themeFamilyStorageKey: string;
  onboardingCompletedStorageKey: string;
  creditsEnabled: boolean;
  storageEnabled: boolean;
  auth: {
    methods: {
      emailPasswordEnabled: boolean;
      emailOtpEnabled: boolean;
      githubEnabled: boolean;
      googleEnabled: boolean;
      appleEnabled: boolean;
    };
    otp: {
      email: AppCommonConfig["auth"]["otp"]["email"];
    };
  };
  safeAreaTop: number;
  safeAreaBottom: number;
  keyboardBottomOffset: number;
}

export interface AuthConfig {
  scheme: string;
  storagePrefix: string;
  cookieStorageKey: string;
  callbackURL: string;
  resetPasswordURL: string;
}
