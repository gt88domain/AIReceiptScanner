import { hashNamespacedValue } from "@repo/shared";
import { and, count, eq, gte } from "drizzle-orm";
import type { Database } from "@/db";
import { user as authUser } from "@/db/schema/auth";
import { creditSignupGrantClaim, creditTransaction } from "@/db/schema/credits";
import {
  addDays,
  createAccountGrantUpdate,
  ensureCreditAccount,
  findTransactionBySource,
  getConfig,
  runCreditBatch,
} from "./internal";
import type { CreditServiceContext, CreditSource, CreditUser, GrantCreditsInput } from "./types";

const SIGNUP_GRANT_IP_CLAIM_LIMIT = 3;
const SIGNUP_GRANT_IP_WINDOW_HOURS = 24;
const SIGNUP_GRANT_USER_AGENT_CLAIM_LIMIT = 5;
const SIGNUP_GRANT_USER_AGENT_WINDOW_DAYS = 30;

function subtractHours(date: Date, hours: number) {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

function resolveGrantExpiresAt(expiresInDays: number | null, now: Date) {
  return expiresInDays === null ? null : addDays(now, expiresInDays);
}

async function countGrantedSignupClaimsByEmail(db: Database, emailHash: string) {
  const [row] = await db
    .select({ count: count() })
    .from(creditSignupGrantClaim)
    .where(
      and(
        eq(creditSignupGrantClaim.emailHash, emailHash),
        eq(creditSignupGrantClaim.status, "granted"),
      ),
    );

  return row?.count ?? 0;
}

async function countGrantedSignupClaimsByIp(db: Database, ipHash: string, since: Date) {
  const [row] = await db
    .select({ count: count() })
    .from(creditSignupGrantClaim)
    .where(
      and(
        eq(creditSignupGrantClaim.ipHash, ipHash),
        eq(creditSignupGrantClaim.status, "granted"),
        gte(creditSignupGrantClaim.createdAt, since),
      ),
    );

  return row?.count ?? 0;
}

async function countGrantedSignupClaimsByUserAgent(
  db: Database,
  userAgentHash: string,
  since: Date,
) {
  const [row] = await db
    .select({ count: count() })
    .from(creditSignupGrantClaim)
    .where(
      and(
        eq(creditSignupGrantClaim.userAgentHash, userAgentHash),
        eq(creditSignupGrantClaim.status, "granted"),
        gte(creditSignupGrantClaim.createdAt, since),
      ),
    );

  return row?.count ?? 0;
}

async function recordBlockedSignupGrantClaim(
  db: Database,
  input: {
    userId: string;
    emailHash: string;
    ipHash: string | null;
    userAgentHash: string | null;
    reason: string;
    now: Date;
  },
) {
  const [existing] = await db
    .select({ id: creditSignupGrantClaim.id })
    .from(creditSignupGrantClaim)
    .where(
      and(
        eq(creditSignupGrantClaim.userId, input.userId),
        eq(creditSignupGrantClaim.status, "blocked"),
        eq(creditSignupGrantClaim.reason, input.reason),
      ),
    )
    .limit(1);
  if (existing) {
    return;
  }

  await db.insert(creditSignupGrantClaim).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    emailHash: input.emailHash,
    ipHash: input.ipHash,
    userAgentHash: input.userAgentHash,
    grantedAmount: 0,
    status: "blocked",
    reason: input.reason,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

async function grantSignupCredits(
  db: Database,
  input: GrantCreditsInput & {
    emailHash: string;
    ipHash: string | null;
    userAgentHash: string | null;
    now: Date;
  },
) {
  try {
    await runCreditBatch(db, [
      db.insert(creditTransaction).values({
        id: crypto.randomUUID(),
        userId: input.user.userId,
        amount: input.amount,
        remainingAmount: input.amount,
        sourceProvider: input.sourceProvider,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        packageId: input.packageId ?? null,
        expiresAt: input.expiresAt ?? null,
        metadata: input.metadata ?? null,
        createdAt: input.now,
        updatedAt: input.now,
      }),
      createAccountGrantUpdate(db, input.user.userId, input.amount, input.now),
      db.insert(creditSignupGrantClaim).values({
        id: crypto.randomUUID(),
        userId: input.user.userId,
        emailHash: input.emailHash,
        ipHash: input.ipHash,
        userAgentHash: input.userAgentHash,
        grantedAmount: input.amount,
        status: "granted",
        reason: "eligible",
        createdAt: input.now,
        updatedAt: input.now,
      }),
    ]);
  } catch (error) {
    const existing = await findTransactionBySource(db, input);
    if (existing) {
      return existing;
    }
    throw error;
  }

  return findTransactionBySource(db, input);
}

export async function ensureSignupGrant(
  db: Database,
  user: CreditUser,
  serviceContext: CreditServiceContext = {},
) {
  const config = getConfig();
  const grant = config.signupGrant;
  if (!config.enabled || !grant?.enabled) {
    await ensureCreditAccount(db, user.userId);
    return;
  }

  const now = new Date();
  const grantSource = {
    sourceProvider: "system",
    sourceType: "signup_grant",
    sourceId: user.userId,
  } satisfies CreditSource;
  if (await findTransactionBySource(db, grantSource)) {
    return;
  }

  const [currentUser] = await db
    .select({
      email: authUser.email,
      emailVerified: authUser.emailVerified,
      phoneNumber: authUser.phoneNumber,
      phoneNumberVerified: authUser.phoneNumberVerified,
    })
    .from(authUser)
    .where(eq(authUser.id, user.userId))
    .limit(1);
  const verifiedIdentity = currentUser?.emailVerified
    ? { namespace: "email", value: currentUser.email }
    : currentUser?.phoneNumberVerified && currentUser.phoneNumber
      ? { namespace: "phone", value: currentUser.phoneNumber }
      : null;
  if (!verifiedIdentity) {
    await ensureCreditAccount(db, user.userId);
    return;
  }

  const requestContext = serviceContext.signupGrant;
  const emailHash = await hashNamespacedValue(
    verifiedIdentity.value,
    verifiedIdentity.namespace,
    requestContext?.hashSecret,
  );
  if (!emailHash) {
    await ensureCreditAccount(db, user.userId);
    return;
  }

  const ipHash = await hashNamespacedValue(
    requestContext?.ipAddress,
    "ip",
    requestContext?.hashSecret,
  );
  const userAgentHash = await hashNamespacedValue(
    requestContext?.userAgent,
    "user-agent",
    requestContext?.hashSecret,
  );

  if ((await countGrantedSignupClaimsByEmail(db, emailHash)) > 0) {
    await ensureCreditAccount(db, user.userId);
    await recordBlockedSignupGrantClaim(db, {
      userId: user.userId,
      emailHash,
      ipHash,
      userAgentHash,
      reason: "identity_already_granted",
      now,
    });
    return;
  }

  if (
    ipHash &&
    (await countGrantedSignupClaimsByIp(
      db,
      ipHash,
      subtractHours(now, SIGNUP_GRANT_IP_WINDOW_HOURS),
    )) >= SIGNUP_GRANT_IP_CLAIM_LIMIT
  ) {
    await ensureCreditAccount(db, user.userId);
    await recordBlockedSignupGrantClaim(db, {
      userId: user.userId,
      emailHash,
      ipHash,
      userAgentHash,
      reason: "ip_limit",
      now,
    });
    return;
  }

  if (
    userAgentHash &&
    (await countGrantedSignupClaimsByUserAgent(
      db,
      userAgentHash,
      addDays(now, -SIGNUP_GRANT_USER_AGENT_WINDOW_DAYS),
    )) >= SIGNUP_GRANT_USER_AGENT_CLAIM_LIMIT
  ) {
    await ensureCreditAccount(db, user.userId);
    await recordBlockedSignupGrantClaim(db, {
      userId: user.userId,
      emailHash,
      ipHash,
      userAgentHash,
      reason: "user_agent_limit",
      now,
    });
    return;
  }

  await grantSignupCredits(db, {
    user,
    amount: grant.amount,
    ...grantSource,
    expiresAt: resolveGrantExpiresAt(grant.expiresInDays, now),
    metadata: { reason: "signup" },
    emailHash,
    ipHash,
    userAgentHash,
    now,
  });
}
