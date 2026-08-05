import { deepMerge } from "@repo/shared";
import { publicRuntimeConfig } from "./public-runtime";
import { productConfig } from "./product-config";
import type {
  AppCommonConfig,
  AppConfig,
  ResolvedNativeCommonConfig,
  AppPlatformCommonConfig,
  ResolvedWebCommonConfig,
} from "./types";

const { creditSignupGrant, membershipPlans, nativeCreditPackages, webCreditPackages } =
  productConfig;

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
      // Optional free credit grant for new web users.
      signupGrant: creditSignupGrant,
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
          // Free plan available without provider prices.
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
                providerPriceId: "price_1SwIdZ4uQgMehpGvGlktz1NL",
              },
              prod: {
                providerPriceId: "price_1SwIdZ4uQgMehpGvGlktz1NL",
              },
              currency: "usd",
              amountCents: 1000,
              priceType: "subscription",
              interval: "month",
              trialDays: 7,
              status: "active",
            },
            {
              // Yearly subscription price.
              id: "yearly",
              provider: "stripe",
              test: {
                providerPriceId: "price_1SwIg44uQgMehpGvlW6FVytH",
              },
              prod: {
                providerPriceId: "price_1SwIg44uQgMehpGvlW6FVytH",
              },
              currency: "usd",
              amountCents: 10000,
              priceType: "subscription",
              interval: "year",
              trialDays: 7,
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
                providerPriceId: "price_1SwIgs4uQgMehpGvFYBteVsk",
              },
              prod: {
                providerPriceId: "price_1SwIgs4uQgMehpGvFYBteVsk",
              },
              currency: "usd",
              amountCents: 200000,
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
      enabled: true,
      // Allows native store purchases for credit packages.
      purchasesEnabled: true,
      // Optional free credit grant for new native users.
      signupGrant: creditSignupGrant,
      // Credit packages available through native in-app purchases.
      packages: nativeCreditPackages,
    },
    // Native app metadata overrides.
    app: {
      // Native app display name.
      name: "TanStack Template",
      // Deep-link scheme used by the native app.
      nativeScheme: "com.aiarticles.template",
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
      enabled: true,
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
                providerPriceId: "tanstack_template_native_10_1m",
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
                providerPriceId: "tanstack_template_native_100_1y",
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
                providerPriceId: "tanstack_template_native_299_lifetime",
                currency: "usd",
                amountCents: 299,
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
                providerPriceId: "pro_monthly_android",
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
                providerPriceId: "pro_yearly_android",
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
  return {
    ...commonConfig,
    credits: appConfig.web.credits,
    routes: appConfig.web.routes,
    payments: appConfig.web.payments,
  };
}

export function resolveNativeCommonConfig(): ResolvedNativeCommonConfig {
  const commonConfig = resolvePlatformCommonConfig(appConfig.native);
  return {
    ...commonConfig,
    credits: appConfig.native.credits,
    routes: appConfig.native.routes,
    payments: appConfig.native.payments,
  };
}
