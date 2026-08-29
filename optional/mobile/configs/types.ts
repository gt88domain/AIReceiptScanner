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
    publicSignupEnabled: boolean;
    methods: {
      emailPasswordEnabled: boolean;
      githubEnabled: boolean;
      googleEnabled: boolean;
      appleEnabled: boolean;
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
