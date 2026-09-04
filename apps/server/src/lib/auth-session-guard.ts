import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { user } from "../db/schema/auth";

export const FRESH_AUTH_SESSION_QUERY = {
  disableCookieCache: true,
};

type DeletedAccountUserSnapshot = {
  email: string;
};

export function buildDeletedAccountUserUpdate(
  currentUser: DeletedAccountUserSnapshot,
  deletedAt: Date,
) {
  return {
    deletedAt,
    email: `${currentUser.email}__deleted_${deletedAt.getTime()}`,
    emailVerified: false,
    phoneNumber: null,
    phoneNumberVerified: false,
  };
}

export function finalizeSoftDeletedSession<T>(
  session: T | null,
  deletedAt: Date | null | undefined,
) {
  if (!session || deletedAt) {
    return null;
  }

  return session;
}

export async function getUserDeletedAt(db: Database, userId: string) {
  const [currentUser] = await db
    .select({ deletedAt: user.deletedAt })
    .from(user)
    .where(eq(user.id, userId));

  return currentUser?.deletedAt ?? null;
}
