/**
 * Browser-safe configuration used by public routes and the base client runtime.
 * Keep catalogs, provider price IDs, and native-only settings out of this entry.
 */
export const publicRuntimeConfig = {
  appName: "TanStack Template",
  supportEmail: "support@demo.aiarticles.com",
  defaultThemePresetKey: "clean-slate",
  features: {
    admin: true,
    billing: true,
    credits: true,
    creditPurchases: true,
    storage: false,
  },
  auth: {
    methods: {
      emailPassword: true,
      emailOtp: false,
      github: false,
      google: false,
      apple: false,
    },
    emailOtp: {
      otpLength: 6,
      expiresInSeconds: 300,
      allowedAttempts: 3,
      resendCooldownSeconds: 60,
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

export type PublicRuntimeConfig = typeof publicRuntimeConfig;

export function resolvePublicRuntimeConfig(): PublicRuntimeConfig {
  return publicRuntimeConfig;
}
