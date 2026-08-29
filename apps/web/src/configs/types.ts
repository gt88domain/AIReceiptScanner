import type { ThemePresetKey } from "./theme-presets";

export interface WebConfig {
  AppName: string;
  AppUrl: string;
  supportEmail: string;
  adminEnabled: boolean;
  billingEnabled: boolean;
  creditsEnabled: boolean;
  creditPurchasesEnabled: boolean;
  ticketsEnabled: boolean;
  storageEnabled: boolean;
  newsletterEnabled: boolean;
  contactFormEnabled: boolean;
  docsEnabled: boolean;
  blogEnabled: boolean;
  /** Capability on AND published content present; gates nav/sitemap/search entries. */
  docsPublic: boolean;
  blogPublic: boolean;
  auth: {
    publicSignupEnabled: boolean;
    methods: {
      emailPasswordEnabled: boolean;
      githubEnabled: boolean;
      googleEnabled: boolean;
      appleEnabled: boolean;
    };
  };
  defaultThemePresetKey: ThemePresetKey;
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
