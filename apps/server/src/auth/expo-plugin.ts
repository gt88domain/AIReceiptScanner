import { HIDE_METADATA } from "better-auth";
import { APIError, createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import * as z from "zod";

// Keep this synchronized with the exact Better Auth versions asserted by
// scripts/check-expo-auth-compatibility.mjs.
export const EXPO_AUTH_PLUGIN_COMPAT_VERSION = "1.6.26";

export function forwardExpoCallbackCookie(context: {
  responseHeaders?: Headers;
  isTrustedOrigin: (origin: string) => boolean;
  setHeader: (name: string, value: string) => void;
}) {
  const headers = context.responseHeaders;
  const location = headers?.get("location");
  if (!location) return;

  let redirectURL: URL;
  try {
    redirectURL = new URL(location);
  } catch {
    return;
  }

  if (redirectURL.protocol === "http:" || redirectURL.protocol === "https:") return;
  if (!context.isTrustedOrigin(location)) return;

  // Native callbacks exchange a one-time handoff, never a bearer cookie in a URL.
  headers?.delete("set-cookie");
  redirectURL.searchParams.delete("cookie");
  context.setHeader("location", redirectURL.toString());
}

function nativeCallback(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? null : url;
  } catch {
    return null;
  }
}

/**
 * Server-only Expo integration, using the existing verification store for short-lived
 * handoffs. The standard Expo client remains responsible for ordinary native cookies.
 */
export function createExpoAuthPlugin(d1?: D1Database) {
  function database() {
    if (!d1) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Native auth unavailable" });
    return d1;
  }

  async function save(identifier: string, value: string, ttlSeconds = 600) {
    const now = Math.floor(Date.now() / 1000);
    await database()
      .prepare(
        "INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(crypto.randomUUID(), identifier, value, now + ttlSeconds, now, now)
      .run();
  }

  async function consume(identifier: string) {
    // The database claim is single-use even across simultaneous requests/isolate replicas.
    return database()
      .prepare("DELETE FROM verification WHERE identifier = ? AND expires_at > ? RETURNING value")
      .bind(identifier, Math.floor(Date.now() / 1000))
      .first<{ value: string }>();
  }

  const expoAuthorizationProxy = createAuthEndpoint(
  "/expo-authorization-proxy",
  {
    method: "GET",
    query: z.object({
      handoff: z.string().uuid(),
    }),
    metadata: HIDE_METADATA,
  },
  async (context) => {
    const record = await consume(`expo:authorization:${context.query.handoff}`);
    if (!record) throw new APIError("BAD_REQUEST", { message: "Invalid or expired native handoff" });
    const { url, cookie } = JSON.parse(record.value) as { url: string; cookie: string };
    // Only server-generated authorization URLs and state cookies are replayed.
    context.setHeader("set-cookie", cookie);
    context.setHeader("cache-control", "no-store");
    context.setHeader("referrer-policy", "no-referrer");
    return context.redirect(url);
  },
);

  const expoExchangeHandoff = createAuthEndpoint(
    "/expo-exchange-handoff",
    {
      method: "POST",
      body: z.object({ handoff: z.string().uuid(), nonce: z.string().length(72) }),
      metadata: HIDE_METADATA,
    },
    async (context) => {
      const record = await consume(`expo:result:${context.body.handoff}:${context.body.nonce}`);
      if (!record) throw new APIError("BAD_REQUEST", { message: "Invalid or expired native handoff" });
      context.setHeader("cache-control", "no-store");
      return context.json({ cookie: record.value });
    },
  );
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
      before: [
        {
          matcher(context: { path?: string }) {
            return context.path === "/sign-in/social" || context.path === "/sign-in/oauth2";
          },
          handler: createAuthMiddleware(async (context) => {
            if (context.body?.idToken) return;
            const callback = nativeCallback(context.body?.callbackURL);
            if (!callback) return;
            if (!context.context.isTrustedOrigin(callback.toString())) {
              throw new APIError("BAD_REQUEST", { message: "Invalid native callback" });
            }
            const flow = crypto.randomUUID();
            const nonce = crypto.randomUUID() + crypto.randomUUID();
            await save(`expo:flow:${flow}`, JSON.stringify({ nonce }));
            callback.searchParams.delete("cookie");
            callback.searchParams.set("expoFlow", flow);
            context.body.callbackURL = callback.toString();
            context.body.errorCallbackURL = callback.toString();
            context.body.newUserCallbackURL = callback.toString();
            context.body.disableRedirect = true;
          }),
        },
      ],
      after: [
        {
          matcher(context: { path?: string }) {
            return context.path === "/sign-in/social" || context.path === "/sign-in/oauth2";
          },
          handler: createAuthMiddleware(async (context) => {
            if (context.body?.idToken) return;
            const flow = nativeCallback(context.body?.callbackURL)?.searchParams.get("expoFlow");
            if (!flow) return;
            const response = context.context.returned;
            const cookie = context.context.responseHeaders?.get("set-cookie");
            context.context.responseHeaders?.delete("set-cookie");
            if (
              !response || typeof response !== "object" || !("url" in response) ||
              typeof response.url !== "string" || !cookie
            ) return;
            const record = await database()
              .prepare("SELECT value FROM verification WHERE identifier = ? AND expires_at > ? LIMIT 1")
              .bind(`expo:flow:${flow}`, Math.floor(Date.now() / 1000))
              .first<{ value: string }>();
            if (!record) throw new APIError("BAD_REQUEST", { message: "Native handoff expired" });
            const authorizationUrl = new URL(response.url);
            const state = authorizationUrl.searchParams.get("state");
            if (!state) throw new APIError("BAD_REQUEST", { message: "Native handoff is missing state" });
            const { nonce } = JSON.parse(record.value) as { nonce: string };
            await database()
              .prepare("UPDATE verification SET value = ?, updated_at = ? WHERE identifier = ?")
              .bind(
                JSON.stringify({ nonce, state }),
                Math.floor(Date.now() / 1000),
                `expo:flow:${flow}`,
              )
              .run();
            await save(`expo:authorization:${flow}`, JSON.stringify({ url: response.url, cookie }));
            const proxy = new URL(`${context.context.baseURL}/expo-authorization-proxy`);
            proxy.searchParams.set("handoff", flow);
            context.setHeader("cache-control", "no-store");
            // The nonce is delivered only to the initiating native HTTP client, not the browser.
            context.context.returned = {
              url: proxy.toString(), redirect: false, handoff: flow, nonce,
            };
          }),
        },
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
            const callback = nativeCallback(headers?.get("location"));
            if (!callback || !context.context.isTrustedOrigin(callback.toString())) return;
            const cookie = headers?.get("set-cookie");
            // A native login must not replace the browser's own existing session.
            forwardExpoCallbackCookie({
              responseHeaders: headers,
              isTrustedOrigin: context.context.isTrustedOrigin,
              setHeader: context.setHeader,
            });
            const flow = callback.searchParams.get("expoFlow");
            if (!flow || !cookie || callback.searchParams.has("error")) return;
            const record = await consume(`expo:flow:${flow}`);
            if (!record) throw new APIError("BAD_REQUEST", { message: "Native handoff expired" });
            const { nonce, state } = JSON.parse(record.value) as { nonce: string; state: string };
            const returnedState = new URL(context.context.request.url).searchParams.get("state");
            if (!returnedState || returnedState !== state) {
              throw new APIError("BAD_REQUEST", { message: "Native handoff state mismatch" });
            }
            await save(`expo:result:${flow}:${nonce}`, cookie, 120);
            callback.searchParams.delete("cookie");
            context.setHeader("cache-control", "no-store");
            context.setHeader("referrer-policy", "no-referrer");
            context.setHeader("location", callback.toString());
          }),
        },
      ],
    },
    endpoints: { expoAuthorizationProxy, expoExchangeHandoff },
  };
}
