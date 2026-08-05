import type { AppCommonConfig } from "@repo/app-config";
import type { LandingPageComponentKey } from "./landing-page-component/landing-page-component-registry";
import type { ThemePresetKey } from "./theme-presets";

export interface WebConfig {
  AppName: string;
  AppUrl: string;
  supportEmail: string;
  adminEnabled: boolean;
  billingEnabled: boolean;
  creditsEnabled: boolean;
  creditPurchasesEnabled: boolean;
  storageEnabled: boolean;
  newsletterEnabled: boolean;
  contactFormEnabled: boolean;
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
  defaultThemePresetKey: ThemePresetKey;
  defaultLandingPageComponents: readonly LandingPageComponentKey[];
}

export type AuthUrls = {
  callbackURL: string;
  errorCallbackURL: string;
  resetPasswordCallbackURL: string;
};

export type BillingUrls = {
  successURL: string;
  cancelURL: string;
  returnURL: string;
};
