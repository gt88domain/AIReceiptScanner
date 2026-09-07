import { hashNamespacedValue } from "@repo/shared";
import { and, count, eq, gte, notExists, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { user as authUser } from "@/db/schema/auth";
import { creditAccount, creditSignupGrantClaim, creditTransaction } from "@/db/schema/credits";
import {
  addDays,
  createBatchChangeGuard,
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
  const claimId = crypto.randomUUID();
  const transactionId = crypto.randomUUID();
  const expiresAt = input.expiresAt ?? null;
  const metadata = input.metadata ?? null;
  const emailAlreadyGranted = notExists(
    db
      .select({ id: creditSignupGrantClaim.id })
      .from(creditSignupGrantClaim)
      .where(
        and(
          eq(creditSignupGrantClaim.emailHash, input.emailHash),
          eq(creditSignupGrantClaim.status, "granted"),
        ),
      ),
  );
  const ipHasCapacity =
    input.ipHash === null
      ? undefined
      : sql`(
          SELECT COUNT(*)
          FROM ${creditSignupGrantClaim}
          WHERE ${creditSignupGrantClaim.ipHash} = ${input.ipHash}
            AND ${creditSignupGrantClaim.status} = 'granted'
            AND ${creditSignupGrantClaim.createdAt} >= ${subtractHours(
              input.now,
              SIGNUP_GRANT_IP_WINDOW_HOURS,
            )}
        ) < ${SIGNUP_GRANT_IP_CLAIM_LIMIT}`;
  const userAgentHasCapacity =
    input.userAgentHash === null
      ? undefined
      : sql`(
          SELECT COUNT(*)
          FROM ${creditSignupGrantClaim}
          WHERE ${creditSignupGrantClaim.userAgentHash} = ${input.userAgentHash}
            AND ${creditSignupGrantClaim.status} = 'granted'
            AND ${creditSignupGrantClaim.createdAt} >= ${addDays(
              input.now,
              -SIGNUP_GRANT_USER_AGENT_WINDOW_DAYS,
            )}
        ) < ${SIGNUP_GRANT_USER_AGENT_CLAIM_LIMIT}`;
  const claimEligibility = and(
    emailAlreadyGranted,
    ...(ipHasCapacity ? [ipHasCapacity] : []),
    ...(userAgentHasCapacity ? [userAgentHasCapacity] : []),
  );

  try {
    await runCreditBatch(db, [
      db.insert(creditSignupGrantClaim).select(
        db
          .select({
            id: sql<string>`${claimId}`.as("id"),
            userId: sql<string>`${input.user.userId}`.as("user_id"),
            emailHash: sql<string>`${input.emailHash}`.as("email_hash"),
            ipHash: sql<string | null>`${input.ipHash}`.as("ip_hash"),
            userAgentHash: sql<string | null>`${input.userAgentHash}`.as("user_agent_hash"),
            grantedAmount: sql<number>`${input.amount}`.as("granted_amount"),
            status: sql<"granted">`'granted'`.as("status"),
            reason: sql<"eligible">`'eligible'`.as("reason"),
            createdAt: sql<Date>`${input.now}`.as("created_at"),
            updatedAt: sql<Date>`${input.now}`.as("updated_at"),
          })
          .from(authUser)
          .where(and(eq(authUser.id, input.user.userId), claimEligibility)),
      ),
      db.insert(creditTransaction).select(
        db
          .select({
            id: sql<string>`${transactionId}`.as("id"),
            userId: creditSignupGrantClaim.userId,
            amount: sql<number>`${input.amount}`.as("amount"),
            remainingAmount: sql<number>`${input.amount}`.as("remaining_amount"),
            sourceProvider: sql<string>`${input.sourceProvider}`.as("source_provider"),
            sourceType: sql<string>`${input.sourceType}`.as("source_type"),
            sourceId: sql<string>`${input.sourceId}`.as("source_id"),
            packageId: sql<string | null>`${input.packageId ?? null}`.as("package_id"),
            expiresAt: sql<Date | null>`${expiresAt}`.as("expires_at"),
            metadata: sql<string | null>`${metadata ? JSON.stringify(metadata) : null}`.as(
              "metadata",
            ),
            createdAt: sql<Date>`${input.now}`.as("created_at"),
            updatedAt: sql<Date>`${input.now}`.as("updated_at"),
          })
          .from(creditSignupGrantClaim)
          .where(and(eq(creditSignupGrantClaim.id, claimId), sql`changes() = 1`)),
      ),
      db
        .update(creditAccount)
        .set({
          balance: sql`${creditAccount.balance} + ${input.amount}`,
          totalGranted: sql`${creditAccount.totalGranted} + ${input.amount}`,
          updatedAt: input.now,
        })
        .where(and(eq(creditAccount.userId, input.user.userId), sql`changes() = 1`)),
      createBatchChangeGuard(db, input),
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

  await ensureCreditAccount(db, user.userId);
  const granted = await grantSignupCredits(db, {
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
  if (!granted) {
    await recordBlockedSignupGrantClaim(db, {
      userId: user.userId,
      emailHash,
      ipHash,
      userAgentHash,
      reason: "eligibility_changed",
      now,
    });
  }
}
