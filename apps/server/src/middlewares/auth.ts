import { createMiddleware } from "hono/factory";
import { getAuthSession, type AuthSession } from "../auth/adapter";
import { createDb } from "../db";
import { finalizeSoftDeletedSession, getUserDeletedAt } from "../lib/auth-session-guard";
import type { ServerRuntimeConfig } from "../lib/runtime-config";

type User = NonNullable<AuthSession>["user"] | null;
type Session = NonNullable<AuthSession>["session"] | null;

declare module "hono" {
  interface ContextVariableMap {
    user: User;
    session: Session;
  }
}

export function createAuthSessionMiddleware(runtimeConfig: ServerRuntimeConfig) {
  return createMiddleware<{ Bindings: Cloudflare.Env }>(async (c, next) => {
    const db = createDb(c.env.DB);
    const rawSession = await getAuthSession(
      c.env.DB,
      new Headers(c.req.raw.headers),
      runtimeConfig,
      c.env,
    );
    const deletedAt = rawSession ? await getUserDeletedAt(db, rawSession.user.id) : null;
    const session = finalizeSoftDeletedSession(rawSession, deletedAt);

    if (!session) {
      c.set("user", null);
      c.set("session", null);
      await next();
      return;
    }

    c.set("user", session.user);
    c.set("session", session.session);
    await next();
  });
}
