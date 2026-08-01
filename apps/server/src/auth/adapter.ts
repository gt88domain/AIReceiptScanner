import { createAuth } from "@/lib/auth";
import { FRESH_AUTH_SESSION_QUERY } from "@/lib/auth-session-guard";

export type AuthSession = Awaited<ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>>;

/** The only adapter entry point for resolving a request session. */
export function getAuthSession(d1: D1Database, headers: Headers) {
  return createAuth(d1).api.getSession({
    headers,
    query: FRESH_AUTH_SESSION_QUERY,
  });
}

/** The only adapter entry point for Better Auth's HTTP endpoints. */
export function handleAuthRequest(d1: D1Database, request: Request) {
  return createAuth(d1).handler(request);
}
