import { resolveNativeCommonConfig } from "@repo/app-config";
import type { Context as HonoContext } from "hono";
import { createAuth } from "../lib/auth";

const nativeConfig = resolveNativeCommonConfig();

function getSetCookieHeaders(response: Response): string[] {
  const headersWithGetSetCookie = response.headers as Headers & {
    getSetCookie?: () => string[];
    getAll?: (name: string) => string[];
  };

  const setCookies = headersWithGetSetCookie.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    return setCookies;
  }

  const getAllSetCookies = headersWithGetSetCookie.getAll?.("set-cookie") ?? [];
  if (getAllSetCookies.length > 0) {
    return getAllSetCookies;
  }

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    return [];
  }

  return [setCookie];
}

/**
 * Native verify-email bridge handler.
 *
 * Verifies the token with Better Auth, then forwards the resulting Set-Cookie
 * to native callback URL as query param so Expo client can persist session.
 */
export async function handleNativeVerifyEmailBridge(
  c: HonoContext<{ Bindings: Cloudflare.Env }>,
): Promise<Response> {
  const token = c.req.query("token");
  const callbackURL = c.req.query("callbackURL");
  const nativeCallbackScheme = `${nativeConfig.app.name}://`;

  if (!token || !callbackURL) {
    return c.json({ error: "invalid_request" }, 400);
  }

  if (!callbackURL.startsWith(nativeCallbackScheme)) {
    return c.json({ error: "invalid_callback_url" }, 400);
  }

  const callback = new URL(callbackURL);
  callback.searchParams.set("flow", "verify-email");
  const verifyEmailURL = new URL("/api/auth/verify-email", c.req.url);
  verifyEmailURL.searchParams.set("token", token);

  const request = new Request(verifyEmailURL.toString(), {
    method: "GET",
    headers: new Headers(c.req.raw.headers),
  });
  const response = await createAuth(c.env.DB).handler(request);
  const setCookies = getSetCookieHeaders(response);

  if (!response.ok || setCookies.length === 0) {
    callback.searchParams.set("error", "email_verification_failed");
    return c.redirect(callback.toString(), 302);
  }

  for (const setCookie of setCookies) {
    callback.searchParams.append("cookie", setCookie);
  }
  return c.redirect(callback.toString(), 302);
}
