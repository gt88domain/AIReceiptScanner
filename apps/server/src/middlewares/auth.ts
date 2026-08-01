import { createMiddleware } from "hono/factory";
import { getAuthSession, type AuthSession } from "../auth/adapter";
import { createDb } from "../db";
import { finalizeSoftDeletedSession, getUserDeletedAt } from "../lib/auth-session-guard";

type User = NonNullable<AuthSession>["user"] | null;
type Session = NonNullable<AuthSession>["session"] | null;

declare module "hono" {
  interface ContextVariableMap {
    user: User;
    session: Session;
  }
}

export const authSessionMiddleware = createMiddleware<{
  Bindings: { DB: D1Database; STORAGE: R2Bucket };
}>(async (c, next) => {
  const db = createDb(c.env.DB);
  const rawSession = await getAuthSession(c.env.DB, new Headers(c.req.raw.headers));
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
