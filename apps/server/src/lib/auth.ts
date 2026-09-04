import { resolveCommonConfig } from "@repo/app-config";
import { joinUrl, parseRuntimeUrl } from "@repo/shared";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { customSession } from "better-auth/plugins";
import { localization } from "better-auth-localization";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { createT, getLocaleFromHeaders, getLocaleFromRequest } from "@/i18n";
import { getAppleProviderConfig } from "@/lib/apple-auth";
import { createExpoAuthPlugin } from "@/auth/expo-plugin";
import { resolveSignupPolicy } from "@/auth/signup-policy";
import {
  normalizeAvatarForOutput,
  normalizeAvatarUrl,
  resolveAllowedRemoteAvatarHosts,
} from "@/auth/avatar-policy";
import { hashPassword, verifyPassword } from "@/lib/password";
import * as schema from "../db/schema/auth";
import {
  createEmailService,
  sendResetPasswordEmailFromRequest,
  sendVerificationEmailFromRequest,
} from "../emails";
import type { Locale } from "@repo/i18n";
import { resolveOriginConfig, type ServerRuntimeConfig } from "./runtime-config";
import { logSafeError } from "./safe-error";
import { isBackofficePreview } from "./backoffice-preview";

const commonConfig = resolveCommonConfig();

/**
 * Map our locale to better-auth-localization locale
 * See: https://github.com/marcellosso/better-auth-localization/tree/main/src/translations
 */
const betterAuthLocaleMap = {
  en: "default",
  zh: "zh-Hans",
  jp: "ja-JP",
} as const satisfies Record<Locale, string>;

const authCache = new WeakMap<D1Database, ReturnType<typeof betterAuth>>();

function resolveCookiePolicy(
  nodeEnv: string | undefined,
  serverUrl: string | undefined,
  websiteUrl: string | undefined,
): {
  cookieDomain: string | undefined;
  sameSite: "Lax" | "None";
  secure: boolean;
} {
  const server = parseRuntimeUrl(serverUrl);
  const website = parseRuntimeUrl(websiteUrl);
  const configuredSite = parseRuntimeUrl(commonConfig.app.websiteUrl);
  const isProduction = nodeEnv === "production";
  if (isProduction && (!server.isHttps || !website.isHttps)) {
    throw new Error("[auth:AUTH_PRODUCTION_URL_NOT_HTTPS] Auth public URLs must use HTTPS.");
  }

  const cookieDomain =
    configuredSite.isValid &&
    configuredSite.hostname &&
    server.hostname &&
    website.hostname &&
    server.hostname !== website.hostname &&
    [server.hostname, website.hostname].every(
      (hostname) =>
        hostname === configuredSite.hostname || hostname.endsWith(`.${configuredSite.hostname}`),
    )
      ? configuredSite.hostname
      : undefined;
  const isCrossSite =
    Boolean(server.hostname) &&
    Boolean(website.hostname) &&
    server.hostname !== website.hostname &&
    !cookieDomain;
  const secure = server.isHttps;

  // Cross-site cookies require SameSite=None and Secure=true.
  const sameSite = isCrossSite && secure ? "None" : "Lax";

  return {
    cookieDomain,
    sameSite,
    secure,
  };
}

export function createAuth(
  d1: D1Database,
  runtimeConfig: ServerRuntimeConfig,
  runtimeEnv: Cloudflare.Env,
) {
  const cached = authCache.get(d1);
  if (cached) return cached;

  const db = drizzle(d1);
  const runtimeNodeEnv = runtimeEnv.NODE_ENV;
  const backofficePreview = isBackofficePreview(runtimeEnv);
  const signupPolicy = resolveSignupPolicy({
    backofficePreview,
    emailPasswordEnabled: commonConfig.auth.methods.emailPasswordEnabled,
    publicSignupEnabled: commonConfig.auth.publicSignupEnabled,
  });
  const origins = resolveOriginConfig(runtimeEnv);
  const { cookieDomain, sameSite, secure } = resolveCookiePolicy(
    runtimeNodeEnv,
    origins.apiRuntimeOrigin,
    origins.webRuntimeOrigin,
  );
  const resolveEmailService = (capability: "verification" | "passwordReset") => {
    if (backofficePreview) {
      throw new APIError("BAD_REQUEST", { message: "Email is disabled in Backoffice preview." });
    }
    if (!runtimeConfig.email.enabled) {
      throw new APIError("BAD_REQUEST", { message: "Email is disabled." });
    }
    if (!runtimeConfig.email.capabilities[capability]) {
      throw new APIError("BAD_REQUEST", { message: "This email capability is disabled." });
    }
    const service = createEmailService(runtimeConfig.email, runtimeEnv);
    if (!service) throw new APIError("BAD_REQUEST", { message: "Email is disabled." });
    return service;
  };
  const auth = betterAuth<BetterAuthOptions>({
    baseURL: origins.authPublicOrigin,
    appName: commonConfig.app.name,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    user: {
      // Admin authorization is email-based, so self-service email changes are
      // disabled rather than creating a second privilege-sensitive workflow.
      changeEmail: { enabled: false },
    },
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github"],
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        updateUserInfoOnLink: false,
      },
    },
    session: {
      cookieCache: {
        enabled: false,
      },
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (nextUser) => {
            if (nextUser.image === undefined) return;
            return {
              data: {
                ...nextUser,
                image: normalizeAvatarUrl(
                  nextUser.image,
                  resolveAllowedRemoteAvatarHosts(runtimeEnv.SERVER_URL),
                ),
              },
            };
          },
        },
        update: {
          before: async (nextUser) => {
            if (nextUser.image === undefined) return;
            return {
              data: {
                ...nextUser,
                image: normalizeAvatarUrl(
                  nextUser.image,
                  resolveAllowedRemoteAvatarHosts(runtimeEnv.SERVER_URL),
                ),
              },
            };
          },
        },
      },
      session: {
        create: {
          before: async (nextSession, context) => {
            const [currentUser] = await db
              .select({ deletedAt: schema.user.deletedAt })
              .from(schema.user)
              .where(eq(schema.user.id, nextSession.userId));

            if (currentUser?.deletedAt) {
              const locale = context?.headers ? getLocaleFromHeaders(context.headers) : undefined;
              const t = createT(locale);
              throw new APIError("UNAUTHORIZED", {
                message: t("errors.accountDeleted"),
              });
            }
          },
        },
      },
    },
    trustedOrigins: [
      ...origins.authTrustedOrigins,
      ...(runtimeConfig.features.mobile ? [commonConfig.app.nativeScheme + "://"] : []),

      // Development mode - Expo's exp:// scheme with local IP ranges
      ...(runtimeConfig.features.mobile && String(runtimeNodeEnv) === "development"
        ? [
            "exp://", // Trust all Expo URLs (prefix matching)
            "exp://**", // Trust all Expo URLs (wildcard matching)
            "exp://192.168.*.*:*/**", // Trust 192.168.x.x IP range with any port and path
          ]
        : []),
    ],
    emailAndPassword: {
      enabled: signupPolicy.emailPasswordEnabled,
      disableSignUp: signupPolicy.signupDisabled,
      requireEmailVerification: backofficePreview
        ? false
        : runtimeConfig.email.capabilities.verification,
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
      sendResetPassword: async ({ user, url }, request) => {
        try {
          await sendResetPasswordEmailFromRequest(
            resolveEmailService("passwordReset"),
            request,
          )({
            to: user.email,
            name: user.name || "User",
            resetUrl: url,
          });
        } catch (error) {
          const traceId = logSafeError("Password reset email delivery failed", error);
          throw new APIError("INTERNAL_SERVER_ERROR", {
            code: "EMAIL_DELIVERY_FAILED",
            message: "Email service is temporarily unavailable.",
            traceId,
          });
        }
      },
    },
    emailVerification: {
      // Verification proves control of the mailbox; it never creates a browser or native session.
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }, request) => {
        try {
          await sendVerificationEmailFromRequest(
            resolveEmailService("verification"),
            request,
          )({
            to: user.email,
            name: user.name || "User",
            verificationUrl: url,
          });
        } catch (error) {
          const traceId = logSafeError("Verification email delivery failed", error);
          throw new APIError("INTERNAL_SERVER_ERROR", {
            code: "EMAIL_DELIVERY_FAILED",
            message: "Email service is temporarily unavailable.",
            traceId,
          });
        }
      },
    },
    socialProviders: {
      github: {
        enabled: commonConfig.auth.methods.githubEnabled ?? false,
        disableSignUp: signupPolicy.signupDisabled,
        clientId: runtimeEnv.GITHUB_CLIENT_ID || "",
        clientSecret: runtimeEnv.GITHUB_CLIENT_SECRET || "",
        redirectURI: joinUrl(runtimeEnv.SERVER_URL, "/api/auth/callback/github"),
        scope: ["read:user", "user:email"],
      },
      google: {
        prompt: "select_account",
        enabled: commonConfig.auth.methods.googleEnabled ?? false,
        disableSignUp: signupPolicy.signupDisabled,
        clientId: runtimeEnv.GOOGLE_CLIENT_ID || "",
        clientSecret: runtimeEnv.GOOGLE_CLIENT_SECRET || "",
        redirectURI: joinUrl(runtimeEnv.SERVER_URL, "/api/auth/callback/google"),
        scope: ["openid", "email", "profile"],
      },
      apple: {
        ...getAppleProviderConfig(),
        enabled: commonConfig.auth.methods.appleEnabled ?? false,
        disableSignUp: signupPolicy.signupDisabled,
      },
    },
    rateLimit: {
      enabled: true,
      // Database storage makes Better Auth's atomic consume step shared across Workers isolates.
      // Better Auth keeps stricter built-in rules for sign-in, reset, and verification endpoints.
      storage: "database",
      window: 60,
      max: 30,
    },
    advanced: {
      // https://better-auth.com/docs/reference/options#advanced
      ipAddress: {
        ipAddressHeaders:
          runtimeNodeEnv === "production"
            ? ["cf-connecting-ip"]
            : ["cf-connecting-ip", "x-real-ip"],
      },
      cookiePrefix: "better-auth-v2",
      useSecureCookies: secure,
      crossSubDomainCookies: cookieDomain ? { enabled: true, domain: cookieDomain } : undefined,
      defaultCookieAttributes: {
        sameSite,
        secure,
        httpOnly: true,
        // shared subdomains
        domain: cookieDomain,
        path: "/",
      },
    },
    plugins: [
      customSession(async ({ session, user }) => ({
        session,
        user: normalizeAvatarForOutput(user, runtimeEnv.SERVER_URL),
      })),
      ...(runtimeConfig.features.mobile ? [createExpoAuthPlugin()] : []),
      localization({
        defaultLocale: "default",
        getLocale: (request) => {
          if (!request) return "default";
          const locale = getLocaleFromRequest(request);
          return betterAuthLocaleMap[locale];
        },
      }),
    ],
  });

  authCache.set(d1, auth);
  return auth;
}
