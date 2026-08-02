import { HIDE_METADATA } from "better-auth";
import { APIError, createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import * as z from "zod";

// Keep this synchronized with the exact Better Auth versions asserted by
// scripts/check-expo-auth-compatibility.mjs.
export const EXPO_AUTH_PLUGIN_COMPAT_VERSION = "1.6.23";

const expoAuthorizationProxy = createAuthEndpoint(
  "/expo-authorization-proxy",
  {
    method: "GET",
    query: z.object({
      authorizationURL: z.string(),
      oauthState: z.string().optional(),
    }),
    metadata: HIDE_METADATA,
  },
  async (context) => {
    const { authorizationURL, oauthState } = context.query;
    if (authorizationURL.includes("#")) {
      throw new APIError("BAD_REQUEST", { message: "Invalid authorizationURL" });
    }

    let url: URL;
    try {
      url = new URL(authorizationURL);
    } catch {
      throw new APIError("BAD_REQUEST", { message: "Invalid authorizationURL" });
    }

    if (url.protocol !== "https:" || url.origin === new URL(context.context.baseURL).origin) {
      throw new APIError("BAD_REQUEST", { message: "Invalid authorizationURL" });
    }

    if (oauthState) {
      const oauthStateCookie = context.context.createAuthCookie("oauth_state", { maxAge: 600 });
      context.setCookie(oauthStateCookie.name, oauthState, oauthStateCookie.attributes);
      return context.redirect(authorizationURL);
    }

    const state = url.searchParams.get("state");
    if (!state) throw new APIError("BAD_REQUEST", { message: "Unexpected error" });

    const stateCookie = context.context.createAuthCookie("state", { maxAge: 300 });
    await context.setSignedCookie(
      stateCookie.name,
      state,
      context.context.secret,
      stateCookie.attributes,
    );
    return context.redirect(authorizationURL);
  },
);

/**
 * Server-only half of Better Auth's Expo integration.
 *
 * Keeping it local avoids installing Expo's optional peer dependencies in
 * Web-only projects. The mobile client still uses @better-auth/expo.
 */
export function createExpoAuthPlugin() {
  return {
    id: "expo",
    version: EXPO_AUTH_PLUGIN_COMPAT_VERSION,
    init: () => ({
      options: {
        trustedOrigins: String(process.env.NODE_ENV) === "development" ? ["exp://"] : [],
      },
    }),
    async onRequest(request: Request) {
      if (request.headers.get("origin")) return;

      const expoOrigin = request.headers.get("expo-origin");
      if (!expoOrigin) return;

      try {
        request.headers.set("origin", expoOrigin);
        return { request };
      } catch {
        const headers = new Headers(request.headers);
        headers.set("origin", expoOrigin);
        return { request: new Request(request, { headers }) };
      }
    },
    hooks: {
      after: [
        {
          matcher(context: { path?: string }) {
            return Boolean(
              context.path?.startsWith("/callback") ||
              context.path?.startsWith("/oauth2/callback") ||
              context.path?.startsWith("/magic-link/verify") ||
              context.path?.startsWith("/verify-email"),
            );
          },
          handler: createAuthMiddleware(async (context) => {
            const headers = context.context.responseHeaders;
            const location = headers?.get("location");
            if (!location || location.includes("/oauth-proxy-callback")) return;

            let redirectURL: URL;
            try {
              redirectURL = new URL(location);
            } catch {
              return;
            }

            if (redirectURL.protocol === "http:" || redirectURL.protocol === "https:") return;
            if (!context.context.isTrustedOrigin(location)) return;

            const cookie = headers?.get("set-cookie");
            if (!cookie) return;

            redirectURL.searchParams.set("cookie", cookie);
            context.setHeader("location", redirectURL.toString());
          }),
        },
      ],
    },
    endpoints: { expoAuthorizationProxy },
  };
}
