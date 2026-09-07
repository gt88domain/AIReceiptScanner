import { deepMerge } from "@repo/shared";
import { publicRuntimeConfig, resolvePublicRuntimeConfig } from "./public-runtime";
import { productConfig } from "./product-config";
import { resolveProfileBuildId } from "./profile-build-env";
import { productProfileDefinitions } from "./profile-definitions";
import type {
  AppCommonConfig,
  AppConfig,
  ResolvedNativeCommonConfig,
  AppPlatformCommonConfig,
  ResolvedWebCommonConfig,
} from "./types";

const { membershipPlans, nativeCreditPackages, webCreditPackages } = productConfig;

const appConfig: AppConfig = {
  // Shared defaults inherited by web and native unless a platform overrides them.
  common: {
    ...productConfig.common,
    // Add product feature gates here, for example: { "design.generate": { minimumTier: "monthly" } }.
    featureCapabilities: {},
    // Canonical product-level membership semantics shared by web, native, and server.
    membership: {
      plans: membershipPlans,
    },
  },
  // Web-only configuration.
  web: {
    // Web credit system settings and purchasable web packages.
    credits: {
      // Controls whether web credit routes and sidebar entries are visible.
      enabled: publicRuntimeConfig.features.credits,
      // Allows web checkout for credit packages. Disable to keep grants/usage without sales.
      purchasesEnabled: publicRuntimeConfig.features.creditPurchases,
      // Credit packages available through web checkout.
      packages: webCreditPackages,
    },
    // Route paths used by web auth, billing, and payment return flows.
    routes: {
      // Sign-in page path.
      authSignIn: publicRuntimeConfig.routes.authSignIn,
      // Password reset page path.
      authResetPassword: publicRuntimeConfig.routes.authResetPassword,
      // Route shown after successful checkout.
      billingSuccess: publicRuntimeConfig.routes.billingSuccess,
      // Route shown after canceled checkout.
      billingCancel: publicRuntimeConfig.routes.billingCancel,
      // Route returned to after billing portal actions.
      billingReturn: publicRuntimeConfig.routes.billingReturn,
    },
    // Web subscription and lifetime payment settings.
    payments: {
      // Enables web billing runtime paths.
      enabled: publicRuntimeConfig.features.billing,
      // Default payment provider for web billing.
      provider: "stripe",
      // Web provider price IDs are split by environment to avoid using test IDs in production.
      plans: [
        {
          // Internal no-entitlement state; this is not a public free product offer.
          id: "free",
        },
        {
          // Subscription plan with monthly and yearly prices.
          id: "pro",
          prices: [
            {
              // Monthly subscription price.
              id: "monthly",
              provider: "stripe",
              test: {
                providerPriceId: "replace-with-stripe-test-pro-monthly-price-id",
              },
              prod: {
                providerPriceId: "replace-with-stripe-live-pro-monthly-price-id",
              },
              currency: "usd",
              amountCents: 1000,
              priceType: "subscription",
              interval: "month",
              status: "active",
            },
            {
              // Yearly subscription price.
              id: "yearly",
              provider: "stripe",
              test: {
                providerPriceId: "replace-with-stripe-test-pro-yearly-price-id",
              },
              prod: {
                providerPriceId: "replace-with-stripe-live-pro-yearly-price-id",
              },
              currency: "usd",
              amountCents: 10000,
              priceType: "subscription",
              interval: "year",
              status: "active",
            },
          ],
        },
        {
          // One-time lifetime access plan.
          id: "lifetime",
          prices: [
            {
              // One-time lifetime purchase price.
              id: "lifetime",
              provider: "stripe",
              test: {
                providerPriceId: "replace-with-stripe-test-lifetime-price-id",
              },
              prod: {
                providerPriceId: "replace-with-stripe-live-lifetime-price-id",
              },
              currency: "usd",
              amountCents: 29900,
              priceType: "lifetime",
              status: "active",
            },
          ],
        },
      ],
    },
  },
  // Native-only configuration.
  native: {
    // Native credit system settings and purchasable in-app credit packages.
    credits: {
      // Controls whether native credit screens and queries are available.
      enabled: false,
      // Allows native store purchases for credit packages.
      // AINovel baseline: paid features stay disabled until pricing and
      // entitlement APIs are confirmed (see docs/plans/ainovel-v2-rebuild.md).
      purchasesEnabled: false,
      // Credit packages available through native in-app purchases.
      packages: nativeCreditPackages,
    },
    // Native app metadata overrides.
    app: {
      // Native app display name.
      name: "AINovel",
      // Deep-link scheme used by the native app.
      nativeScheme: "com.ainovel.desktop",
    },
    // Native deep-link and legal document routes.
    routes: {
      // Auth callback path used by native redirect flows.
      authSignIn: "/callback",
      // Terms of Service route opened from the native app.
      termsOfService: "/terms",
      // Privacy Policy route opened from the native app.
      privacyPolicy: "/privacy",
      // Password reset route opened from the native app.
      resetPassword: "/reset-password",
    },
    // Native subscription and lifetime payment settings.
    payments: {
      // Enables native billing runtime paths.
      enabled: false,
      // Provider used for native purchases.
      provider: "revenuecat",
      // iOS in-app purchase catalog.
      ios: {
        plans: [
          {
            // Subscription plan available on iOS.
            id: "pro",
            prices: [
              {
                // Monthly iOS subscription product.
                id: "monthly",
                provider: "revenuecat",
                providerPriceId: "replace-with-revenuecat-ios-pro-monthly-product-id",
                currency: "usd",
                amountCents: 1000,
                priceType: "subscription",
                interval: "month",
                status: "active",
              },
              {
                // Yearly iOS subscription product.
                id: "yearly",
                provider: "revenuecat",
                providerPriceId: "replace-with-revenuecat-ios-pro-yearly-product-id",
                currency: "usd",
                amountCents: 10000,
                priceType: "subscription",
                interval: "year",
                status: "active",
              },
            ],
          },
          {
            // One-time lifetime access plan available on iOS.
            id: "lifetime",
            prices: [
              {
                // Lifetime iOS product.
                id: "lifetime",
                provider: "revenuecat",
                providerPriceId: "replace-with-revenuecat-ios-lifetime-product-id",
                currency: "usd",
                amountCents: 29900,
                priceType: "lifetime",
                status: "active",
              },
            ],
          },
        ],
      },
      // Android in-app purchase catalog.
      android: {
        plans: [
          {
            // Subscription plan available on Android.
            id: "pro",
            prices: [
              {
                // Monthly Android subscription product.
                id: "monthly",
                provider: "revenuecat",
                providerPriceId: "replace-with-revenuecat-android-pro-monthly-product-id",
                currency: "usd",
                amountCents: 800,
                priceType: "subscription",
                interval: "month",
                status: "active",
              },
              {
                // Yearly Android subscription product.
                id: "yearly",
                provider: "revenuecat",
                providerPriceId: "replace-with-revenuecat-android-pro-yearly-product-id",
                currency: "usd",
                amountCents: 8000,
                priceType: "subscription",
                interval: "year",
                status: "active",
              },
            ],
          },
        ],
      },
    },
  },
};

function resolvePlatformCommonConfig(platformConfig: AppPlatformCommonConfig) {
  const commonOverrides: AppPlatformCommonConfig = {
    app: platformConfig.app,
    auth: platformConfig.auth,
    email: platformConfig.email,
    storage: platformConfig.storage,
  };

  if (Object.keys(commonOverrides).length === 0) {
    return appConfig.common;
  }

  return deepMerge<AppCommonConfig>(appConfig.common, commonOverrides);
}

export function resolveCommonConfig(): AppCommonConfig {
  return resolvePlatformCommonConfig(appConfig.common);
}

export function resolveWebCommonConfig(): ResolvedWebCommonConfig {
  const commonConfig = resolvePlatformCommonConfig(appConfig.web);
  const publicRuntime = resolvePublicRuntimeConfig();
  return {
    ...commonConfig,
    credits: {
      ...appConfig.web.credits,
      enabled: publicRuntime.features.credits,
      purchasesEnabled: publicRuntime.features.creditPurchases,
      signupGrant: commonConfig.credits.signupGrant,
    },
    routes: appConfig.web.routes,
    payments: appConfig.web.payments
      ? { ...appConfig.web.payments, enabled: publicRuntime.features.billing }
      : undefined,
  };
}

export function resolveNativeCommonConfig(): ResolvedNativeCommonConfig {
  const commonConfig = resolvePlatformCommonConfig(appConfig.native);
  const profileId = resolveProfileBuildId();
  if (profileId && !(profileId in productProfileDefinitions)) {
    throw new Error(`[app-config:UNKNOWN_PROFILE] ${profileId} is not an official profile.`);
  }
  const nativeFeatures = profileId
    ? productProfileDefinitions[profileId as keyof typeof productProfileDefinitions].native
    : undefined;
  return {
    ...commonConfig,
    credits: {
      ...appConfig.native.credits,
      enabled: nativeFeatures?.credits ?? appConfig.native.credits.enabled,
      purchasesEnabled: nativeFeatures?.creditPurchases ?? appConfig.native.credits.purchasesEnabled,
      signupGrant: commonConfig.credits.signupGrant,
    },
    routes: appConfig.native.routes,
    payments: appConfig.native.payments
      ? {
          ...appConfig.native.payments,
          enabled: nativeFeatures?.billing ?? appConfig.native.payments.enabled,
        }
      : undefined,
  };
}
