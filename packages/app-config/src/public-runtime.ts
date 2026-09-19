import { productProfileDefinitions } from "./profile-definitions";
import { isBackofficePreviewTicketsEnabled, resolveProfileBuildId } from "./profile-build-env";
import { productFeatureOverrides } from "./product-feature-overrides";
import type { ProductFeatureOverrides } from "./product-profiles";

export type PublicNavigationItem = Readonly<{
  label: string;
  href: string;
}>;

/**
 * Browser-safe configuration used by public routes and the base client runtime.
 * Keep catalogs, provider price IDs, and native-only settings out of this entry.
 */
export const publicRuntimeConfig = {
  appName: "AI Receipt Scanner",
  supportEmail: "support@aireceiptscanner.com",
  defaultThemePresetKey: "clean-slate",
  publicNavigation: [] as readonly PublicNavigationItem[],
  features: {
    admin: true,
    billing: true,
    credits: true,
    creditPurchases: true,
    storage: false,
    tickets: isBackofficePreviewTicketsEnabled(),
    newsletter: true,
    contactForm: true,
  },
  auth: {
    publicSignupEnabled: true,
    methods: {
      emailPassword: true,
      github: false,
      google: false,
      apple: false,
    },
  },
  routes: {
    authSignIn: "/auth/sign-in",
    authResetPassword: "/auth/reset-password",
    billingSuccess: "/billing/success",
    billingCancel: "/billing/cancel",
    billingReturn: "/settings/billing",
  },
} as const;

export type PublicRuntimeConfig = Omit<
  typeof publicRuntimeConfig,
  "auth" | "features" | "publicNavigation"
> & {
  auth: {
    publicSignupEnabled: boolean;
    methods: { [Key in keyof typeof publicRuntimeConfig.auth.methods]: boolean };
  };
  features: { [Key in keyof typeof publicRuntimeConfig.features]: boolean };
  publicNavigation: readonly PublicNavigationItem[];
};

export function resolvePublicRuntimeConfig(
  profileId = resolveProfileBuildId(),
  featureOverrides: Pick<ProductFeatureOverrides, "tickets"> = productFeatureOverrides,
): PublicRuntimeConfig {
  if (!profileId) {
    return {
      ...publicRuntimeConfig,
      features: {
        ...publicRuntimeConfig.features,
        tickets: featureOverrides.tickets ?? publicRuntimeConfig.features.tickets,
      },
    };
  }
  if (!(profileId in productProfileDefinitions)) {
    throw new Error(`[public-runtime:UNKNOWN_PROFILE] ${profileId} is not an official profile.`);
  }
  const profile = productProfileDefinitions[profileId as keyof typeof productProfileDefinitions];
  return {
    ...publicRuntimeConfig,
    features: {
      ...publicRuntimeConfig.features,
      admin: profile.admin,
      billing: profile.web.billing,
      credits: profile.web.credits,
      creditPurchases: profile.web.creditPurchases,
      storage: profile.storage,
      tickets: featureOverrides.tickets ?? profile.tickets,
    },
  };
}
