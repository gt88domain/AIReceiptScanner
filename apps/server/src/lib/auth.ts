import { resolveCommonConfig } from "@repo/app-config";
import { joinUrl, parseHostname, resolveCrossSubdomainCookieDomain } from "@repo/shared";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { localization } from "better-auth-localization";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { createT, getLocaleFromHeaders, getLocaleFromRequest } from "@/i18n";
import { getAppleProviderConfig } from "@/lib/apple-auth";
import { createExpoAuthPlugin } from "@/auth/expo-plugin";
import { hashPassword, verifyPassword } from "@/lib/password";
import * as schema from "../db/schema/auth";
import {
  createEmailService,
  sendResetPasswordEmailFromRequest,
  sendVerificationEmailFromRequest,
} from "../emails";
import type { Locale } from "@repo/i18n";
import { resolveOriginConfig, type ServerRuntimeConfig } from "./runtime-config";

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
  serverUrl: string | undefined,
  websiteUrl: string | undefined,
): {
  cookieDomain: string | undefined;
  sameSite: "Lax" | "None";
  secure: boolean;
} {
  const secure = serverUrl?.startsWith("https") ?? false;
  const cookieDomain = resolveCrossSubdomainCookieDomain(serverUrl, websiteUrl);
  const serverHost = parseHostname(serverUrl);
  const websiteHost = parseHostname(websiteUrl);
  const isCrossSite =
    Boolean(serverHost) && Boolean(websiteHost) && serverHost !== websiteHost && !cookieDomain;

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
  const origins = resolveOriginConfig(runtimeEnv);
  const { cookieDomain, sameSite, secure } = resolveCookiePolicy(
    origins.apiRuntimeOrigin,
    origins.webRuntimeOrigin,
  );
  const resolveEmailService = (capability: "verification" | "passwordReset") => {
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
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github"],
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60,
      },
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    databaseHooks: {
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
      enabled: true,
      requireEmailVerification: runtimeConfig.email.capabilities.verification,
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
          const message =
            error instanceof Error ? error.message : "Failed to send reset password email";
          throw new APIError("BAD_REQUEST", { message });
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
          const message =
            error instanceof Error ? error.message : "Failed to send verification email";
          throw new APIError("BAD_REQUEST", { message });
        }
      },
    },
    socialProviders: {
      github: {
        enabled: commonConfig.auth.methods.githubEnabled ?? false,
        clientId: runtimeEnv.GITHUB_CLIENT_ID || "",
        clientSecret: runtimeEnv.GITHUB_CLIENT_SECRET || "",
        redirectURI: joinUrl(runtimeEnv.SERVER_URL, "/api/auth/callback/github"),
        scope: ["read:user", "user:email"],
      },
      google: {
        prompt: "select_account",
        enabled: commonConfig.auth.methods.googleEnabled ?? false,
        clientId: runtimeEnv.GOOGLE_CLIENT_ID || "",
        clientSecret: runtimeEnv.GOOGLE_CLIENT_SECRET || "",
        redirectURI: joinUrl(runtimeEnv.SERVER_URL, "/api/auth/callback/google"),
        scope: ["openid", "email", "profile"],
      },
      apple: {
        ...getAppleProviderConfig(),
        enabled: commonConfig.auth.methods.appleEnabled ?? false,
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
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
      },
      cookiePrefix: "better-auth-v2",
      defaultCookieAttributes: {
        sameSite,
        secure,
        httpOnly: !runtimeEnv.SERVER_URL?.includes("localhost"),
        // shared subdomains
        domain: cookieDomain,
        path: "/",
      },
    },
    plugins: [
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
