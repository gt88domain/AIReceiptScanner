import { createAuth } from "@/lib/auth";
import { FRESH_AUTH_SESSION_QUERY } from "@/lib/auth-session-guard";
import type { ServerRuntimeConfig } from "@/lib/runtime-config";

export type AuthSession = Awaited<ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>>;

/** The only adapter entry point for resolving a request session. */
export function getAuthSession(
  d1: D1Database,
  headers: Headers,
  runtimeConfig: ServerRuntimeConfig,
  env: Cloudflare.Env,
) {
  return createAuth(d1, runtimeConfig, env).api.getSession({
    headers,
    query: FRESH_AUTH_SESSION_QUERY,
  });
}

/** The only adapter entry point for Better Auth's HTTP endpoints. */
export function handleAuthRequest(
  d1: D1Database,
  request: Request,
  runtimeConfig: ServerRuntimeConfig,
  env: Cloudflare.Env,
) {
  return createAuth(d1, runtimeConfig, env).handler(request);
}
