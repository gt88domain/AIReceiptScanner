import { contentSurfaceFlags } from "./content-flags";
import { publicRuntimeConfig, resolvePublicRuntimeConfig } from "./public-runtime";
import { productMembershipPlans } from "./membership-config";
import { productStorageConfig } from "./product-storage-config";
import type { AppCommonConfig, AppCreditsConfig } from "./types";

const resolvedPublicRuntimeConfig = resolvePublicRuntimeConfig();

/**
 * Product-owned settings. Downstream products edit this file; resolver, type,
 * dependency, and profile code remains protected platform infrastructure.
 */
export const productConfig = {
  common: {
    features: {
      admin: publicRuntimeConfig.features.admin,
      tickets: resolvedPublicRuntimeConfig.features.tickets,
      jobs: true,
      mobile: false,
      docs: contentSurfaceFlags.docs,
      blog: contentSurfaceFlags.blog,
    },
    app: {
      name: publicRuntimeConfig.appName,
      nativeScheme: "com.aiarticles.template",
      supportEmail: publicRuntimeConfig.supportEmail,
      websiteUrl: "https://demo.aiarticles.com",
      socialUrl: "https://x.com",
      appStoreUrl: "https://apps.apple.com/app/id",
    },
    auth: {
      allowedRemoteAvatarHosts: ["avatars.githubusercontent.com", "lh3.googleusercontent.com"],
      publicSignupEnabled: publicRuntimeConfig.auth.publicSignupEnabled,
      methods: {
        emailPasswordEnabled: publicRuntimeConfig.auth.methods.emailPassword,
        githubEnabled: publicRuntimeConfig.auth.methods.github,
        googleEnabled: publicRuntimeConfig.auth.methods.google,
        appleEnabled: publicRuntimeConfig.auth.methods.apple,
      },
    },
    email: {
      enabled: true,
      provider: "resend",
      capabilities: {
        verification: true,
        passwordReset: true,
        newsletter: true,
        contactForm: true,
        operationalAlerts: true,
      },
      from: { localPart: "noreply", domain: "mail.demo.aiarticles.com" },
    },
    storage: productStorageConfig,
  } satisfies Pick<AppCommonConfig, "features" | "app" | "auth" | "email" | "storage">,
  creditSignupGrant: {
    enabled: false,
    amount: 100,
    expiresInDays: 30,
  } satisfies NonNullable<AppCreditsConfig["signupGrant"]>,
  webCreditPackages: [
    {
      id: "starter",
      amount: 100,
      web: {
        provider: "stripe",
        test: { providerPriceId: "price_1TciCP4uQgMehpGv3EK50HN9" },
        prod: { providerPriceId: "price_1TciCP4uQgMehpGv3EK50HN9" },
        currency: "usd",
        amountCents: 499,
        status: "active",
      },
    },
    {
      id: "growth",
      amount: 500,
      web: {
        provider: "stripe",
        test: { providerPriceId: "price_1TciCw4uQgMehpGvxyfhVKud" },
        prod: { providerPriceId: "price_1TciCw4uQgMehpGvxyfhVKud" },
        currency: "usd",
        amountCents: 1999,
        status: "active",
      },
    },
  ] satisfies AppCreditsConfig["packages"],
  nativeCreditPackages: [
    {
      id: "starter",
      amount: 100,
      native: {
        ios: {
          provider: "revenuecat",
          providerProductId: "tanstack_template_credits_starter_ios",
          currency: "usd",
          amountCents: 499,
          status: "active",
        },
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
      id: "growth",
      amount: 500,
      native: {
        ios: {
          provider: "revenuecat",
          providerProductId: "tanstack_template_credits_growth_ios",
          currency: "usd",
          amountCents: 1999,
          status: "active",
        },
        android: {
          provider: "revenuecat",
          providerProductId: "tanstack_template_credits_growth_android",
          currency: "usd",
          amountCents: 1999,
          status: "active",
        },
      },
    },
  ] satisfies AppCreditsConfig["packages"],
  membershipPlans: productMembershipPlans,
} as const;
