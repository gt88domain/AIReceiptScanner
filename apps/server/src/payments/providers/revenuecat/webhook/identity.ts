import { and, inArray, isNull } from "drizzle-orm";
import type { Database } from "@/db";
import { user } from "@/db/schema/auth";
import { revenueCatIdentity } from "@/db/schema/payments";

export function isAnonymousRevenueCatUserId(value: string | null | undefined) {
  return !value || value.startsWith("$RCAnonymousID:");
}

function normalizeAppUserIds(values: Array<string | null | undefined>) {
  return [
    ...new Set(values.filter((value): value is string => !isAnonymousRevenueCatUserId(value))),
  ];
}

/** Resolves a webhook identity only when every active candidate points to one account. */
export async function resolveKnownRevenueCatUserId(
  db: Database,
  values: Array<string | null | undefined>,
) {
  const appUserIds = normalizeAppUserIds(values);
  if (appUserIds.length === 0) return null;

  const identities = await db
    .select({
      providerAppUserId: revenueCatIdentity.providerAppUserId,
      status: revenueCatIdentity.status,
      userId: revenueCatIdentity.userId,
    })
    .from(revenueCatIdentity)
    .where(inArray(revenueCatIdentity.providerAppUserId, appUserIds));
  const identitiesByAppUserId = new Map(
    identities.map((identity) => [identity.providerAppUserId, identity]),
  );
  const unmappedAppUserIds = appUserIds.filter(
    (appUserId) => !identitiesByAppUserId.has(appUserId),
  );
  const directUsers = unmappedAppUserIds.length
    ? await db
        .select({ id: user.id })
        .from(user)
        .where(and(inArray(user.id, unmappedAppUserIds), isNull(user.deletedAt)))
    : [];
  const userIds = new Set([
    ...identities
      .filter((identity) => identity.status === "active")
      .map((identity) => identity.userId),
    ...directUsers.map((candidate) => candidate.id),
  ]);

  return userIds.size === 1 ? [...userIds][0] : null;
}

/** Records trusted aliases without taking an active identity away from another account. */
export async function recordRevenueCatIdentities(
  db: Database,
  input: { appUserIds: Array<string | null | undefined>; userId: string },
) {
  const now = new Date();
  const appUserIds = normalizeAppUserIds(input.appUserIds);
  if (appUserIds.length === 0) return;

  const existing = await db
    .select()
    .from(revenueCatIdentity)
    .where(inArray(revenueCatIdentity.providerAppUserId, appUserIds));
  const existingByAppUserId = new Map(
    existing.map((identity) => [identity.providerAppUserId, identity]),
  );
  const directUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(and(inArray(user.id, appUserIds), isNull(user.deletedAt)));
  const directUserIds = new Set(directUsers.map((candidate) => candidate.id));

  for (const appUserId of appUserIds) {
    const current = existingByAppUserId.get(appUserId);
    if (current?.status === "active" && current.userId !== input.userId) continue;
    if (directUserIds.has(appUserId) && appUserId !== input.userId) continue;

    await db
      .insert(revenueCatIdentity)
      .values({
        providerAppUserId: appUserId,
        userId: input.userId,
        status: "active",
        transferEventId: null,
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: revenueCatIdentity.providerAppUserId,
        set: { status: "active", transferEventId: null, updatedAt: now, userId: input.userId },
      });
  }
}

export async function markRevenueCatIdentitiesTransferred(
  db: Database,
  input: { appUserIds: Array<string | null | undefined>; transferEventId: string; userId: string },
) {
  const now = new Date();
  const appUserIds = normalizeAppUserIds(input.appUserIds);
  if (appUserIds.length === 0) return;

  for (const appUserId of appUserIds) {
    await db
      .insert(revenueCatIdentity)
      .values({
        providerAppUserId: appUserId,
        userId: input.userId,
        status: "transferred",
        transferEventId: input.transferEventId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: revenueCatIdentity.providerAppUserId,
        set: {
          status: "transferred",
          transferEventId: input.transferEventId,
          updatedAt: now,
          userId: input.userId,
        },
      });
  }
}
