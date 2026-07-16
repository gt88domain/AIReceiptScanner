import { deepMerge } from "@repo/shared";
import type {
  AppCommonConfig,
  AppConfig,
  AppCreditsConfig,
  ResolvedNativeCommonConfig,
  AppPlatformCommonConfig,
  ResolvedWebCommonConfig,
} from "./types";

const creditSignupGrant = {
  // Grants free credits to new users when the platform credit system is enabled.
  enabled: true,
  // Number of credits granted on signup.
  amount: 100,
  // Days before the signup grant expires.
  expiresInDays: 30,
} satisfies NonNullable<AppCreditsConfig["signupGrant"]>;

// Credit packages sold through the web checkout provider.
const webCreditPackages = [
  {
    // Internal package ID used by app logic and provider metadata.
    id: "starter",
    // Number of credits delivered after purchase.
    amount: 100,
    // Web checkout settings for this credit package.
    web: {
      // Payment provider used for browser-based purchases.
      provider: "stripe",
      // Provider price used in non-production environments.
      test: {
        providerPriceId: "price_1TciCP4uQgMehpGv3EK50HN9",
      },
      // Provider price used in production.
      prod: {
        providerPriceId: "price_1TciCP4uQgMehpGv3EK50HN9",
      },
      // Currency shown and charged for this package.
      currency: "usd",
      // Price amount in minor units, such as cents.
      amountCents: 499,
      // Whether this package is available for purchase.
      status: "active",
    },
  },
  {
    // Internal package ID used by app logic and provider metadata.
    id: "growth",
    // Number of credits delivered after purchase.
    amount: 500,
    // Web checkout settings for this credit package.
    web: {
      // Payment provider used for browser-based purchases.
      provider: "stripe",
      // Provider price used in non-production environments.
      test: {
        providerPriceId: "price_1TciCw4uQgMehpGvxyfhVKud",
      },
      // Provider price used in production.
      prod: {
        providerPriceId: "price_1TciCw4uQgMehpGvxyfhVKud",
      },
      // Currency shown and charged for this package.
      currency: "usd",
      // Price amount in minor units, such as cents.
      amountCents: 1999,
      // Whether this package is available for purchase.
      status: "active",
    },
  },
] satisfies AppCreditsConfig["packages"];

// Credit packages sold through native in-app purchase providers.
const nativeCreditPackages = [
  {
    // Internal package ID used by app logic and provider metadata.
    id: "starter",
    // Number of credits delivered after purchase.
    amount: 100,
    // Native purchase settings split by mobile platform.
    native: {
      // iOS product configured in RevenueCat/App Store Connect.
      ios: {
        provider: "revenuecat",
        providerProductId: "tanstack_template_credits_starter_ios",
        currency: "usd",
        amountCents: 499,
        status: "active",
      },
      // Android product configured in RevenueCat/Google Play.
      android: {
        provider: "revenuecat",
        providerProductId: "tanstack_template_credits_starter_android",
        currency: "usd",
        amountCents: 499,
        status: "active",
      },
    },
  },
  {
    // Internal package ID used by app logic and provider metadata.
    id: "growth",
    // Number of credits delivered after purchase.
    amount: 500,
    // Native purchase settings split by mobile platform.
    native: {
      // iOS product configured in RevenueCat/App Store Connect.
      ios: {
        provider: "revenuecat",
        providerProductId: "tanstack_template_credits_growth_ios",
        currency: "usd",
        amountCents: 1999,
        status: "active",
      },
      // Android product configured in RevenueCat/Google Play.
      android: {
        provider: "revenuecat",
        providerProductId: "tanstack_template_credits_growth_android",
        currency: "usd",
        amountCents: 1999,
        status: "active",
      },
    },
  },
] satisfies AppCreditsConfig["packages"];

const membershipPlans = [
  {
    id: "pro",
    prices: [
      {
        id: "monthly",
        tier: "monthly",
        priceType: "subscription",
        interval: "month",
        presentationKind: "monthly",
        status: "active",
      },
      {
        id: "yearly",
        tier: "yearly",
        priceType: "subscription",
        interval: "year",
        presentationKind: "yearly",
        status: "active",
      },
    ],
  },
  {
    id: "lifetime",
    prices: [
      {
        id: "lifetime",
        tier: "lifetime",
        priceType: "lifetime",
        interval: null,
        presentationKind: "lifetime",
        status: "active",
      },
    ],
  },
] satisfies AppCommonConfig["membership"]["plans"];

const appConfig: AppConfig = {
  // Shared defaults inherited by web and native unless a platform overrides them.
  common: {
    // Public app metadata used in UI, links, and platform setup.
    app: {
      // Product display name.
      name: "TanStack Template",
      // Deep-link scheme used by the native app.
      nativeScheme: "com.aiarticles.template",
      // Public support contact.
      supportEmail: "support@demo.aiarticles.com",
      // Official marketing or product website.
      websiteUrl: "https://demo.aiarticles.com",
      // Public social profile URL.
      socialUrl: "https://x.com",
      // App Store listing URL used by sharing and rating flows.
      appStoreUrl: "https://apps.apple.com/app/id",
    },
    // Authentication provider settings shared by platform UIs.
    auth: {
      // Login method UI entry points.
      methods: {
        // Controls email/password auth UI entry points.
        emailPasswordEnabled: true,
        // Controls email OTP auth UI entry points.
        emailOtpEnabled: false,
        // Controls SMS auth UI entry points.
        smsEnabled: false,
        // Controls GitHub sign-in UI entry points.
        githubEnabled: false,
        // Controls Google sign-in UI entry points.
        googleEnabled: false,
        // Controls Apple sign-in UI entry points.
        appleEnabled: false,
      },
      // One-time code settings shared by auth flows.
      otp: {
        // Email one-time sign-in code settings.
        email: {
          // Number of digits in one-time sign-in codes.
          otpLength: 6,
          // Verification code lifetime in seconds.
          expiresInSeconds: 300,
          // Maximum failed verification attempts per issued code.huo
          allowedAttempts: 3,
          // Client-side resend cooldown in seconds.
          resendCooldownSeconds: 60,
        },
        // SMS one-time verification code settings.
        sms: {
          // Number of digits in one-time verification codes.
          otpLength: 6,
          // Verification code lifetime in seconds.
          expiresInSeconds: 300,
          // Client-side resend cooldown in seconds.
          resendCooldownSeconds: 60,
        },
      },
    },
    // Outbound email provider settings.
    email: {
      // Provider used to send transactional email.
      provider: "resend",
      // Sender address parts combined into localPart@domain.
      from: {
        localPart: "noreply",
        domain: "demo.aiarticles.com",
      },
    },
    // File upload and public asset storage settings.
    storage: {
      // Disabled by default: the template does not expose an upload feature.
      enabled: false,
      // Provider used for file storage.
      provider: "r2",
      // Public API path used to serve stored files.
      publicPath: "/api/storage",
      // Storage key prefixes by upload purpose.
      keyPrefixes: {
        avatar: "avatars",
        attachment: "attachments",
      },
      // Prefix used when a purpose-specific prefix is unavailable.
      fallbackPrefix: "files",
      // Allowed upload MIME types by purpose.
      allowedTypes: {
        avatar: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        attachment: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/pdf",
          "text/plain",
        ],
      },
      // Maximum upload size in bytes by purpose.
      maxFileSizes: {
        avatar: 5 * 1024 * 1024,
        attachment: 25 * 1024 * 1024,
      },
    },
    // Canonical product-level membership semantics shared by web, native, and server.
    membership: {
      plans: membershipPlans,
    },
    // SMS verification settings.
    sms: {
      // Provider used to send SMS messages.
      provider: "aliyun",
    },
  },
  // Web-only configuration.
  web: {
    // Web credit system settings and purchasable web packages.
    credits: {
      // Controls whether web credit routes and sidebar entries are visible.
      enabled: true,
      // Optional free credit grant for new web users.
      signupGrant: creditSignupGrant,
      // Credit packages available through web checkout.
      packages: webCreditPackages,
    },
    // Route paths used by web auth, billing, and payment return flows.
    routes: {
      // Sign-in page path.
      authSignIn: "/auth/sign-in",
      // Password reset page path.
      authResetPassword: "/auth/reset-password",
      // Route shown after successful checkout.
      billingSuccess: "/billing/success",
      // Route shown after canceled checkout.
      billingCancel: "/billing/cancel",
      // Route returned to after billing portal actions.
      billingReturn: "/settings/billing",
    },
    // Web subscription and lifetime payment settings.
    payments: {
      // Enables web billing runtime paths.
      enabled: true,
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
                amountCents: 200000,
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
    sms: platformConfig.sms,
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
