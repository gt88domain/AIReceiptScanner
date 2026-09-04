import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db";
import { paymentOperation, type PaymentOperation } from "@/db/schema/payments";
import { createLeaseToken, leaseUntil } from "@/lib/lease";
import { PaymentProviderRequestError } from "../public/types";

const OPERATION_LEASE_MS = 5 * 60 * 1000;
const MAX_PAYMENT_OPERATION_ATTEMPTS = 4;
const PAYMENT_OPERATION_RETRY_BASE_MS = 60_000;
const PAYMENT_OPERATION_RETRY_MAX_MS = 60 * 60 * 1000;
const requestEnvelopeSchema = z.object({
  version: z.literal(1),
  payload: z.record(z.string(), z.unknown()),
});
const checkoutResultSchema = z.object({
  providerSessionId: z.string(),
  url: z.url(),
  expiresAt: z.string().datetime().nullable(),
});

export type CheckoutOperationResult = z.infer<typeof checkoutResultSchema>;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

export async function createPaymentOperationRequest(payload: Record<string, unknown>) {
  const requestJson = JSON.stringify({ version: 1, payload: stableValue(payload) });
  requestEnvelopeSchema.parse(JSON.parse(requestJson));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(requestJson));
  return {
    requestHash: Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join(""),
    requestJson,
  };
}

export async function getOrCreatePaymentOperation(
  db: Database,
  input: {
    userId: string;
    provider: PaymentOperation["provider"];
    operationType: PaymentOperation["operationType"];
    operationId: string;
    requestHash: string;
    requestJson: string;
    idempotencyMode: PaymentOperation["idempotencyMode"];
    scopeKey?: string | null;
    relatedResourceType?: PaymentOperation["relatedResourceType"];
    relatedResourceId?: string | null;
  },
) {
  const operationKey = `${input.userId}:${input.operationType}:${input.operationId}`;
  const [existing] = await db
    .select()
    .from(paymentOperation)
    .where(eq(paymentOperation.operationKey, operationKey))
    .limit(1);
  if (existing) {
    if (existing.requestHash !== input.requestHash)
      throw new Error("PAYMENT_OPERATION_REQUEST_MISMATCH");
    return existing;
  }
  const now = new Date();
  const id = crypto.randomUUID();
  try {
    await db.insert(paymentOperation).values({
      id,
      operationKey,
      scopeKey: input.scopeKey ?? null,
      userId: input.userId,
      provider: input.provider,
      operationType: input.operationType,
      requestVersion: 1,
      requestHash: input.requestHash,
      requestJson: input.requestJson,
      status: "pending",
      idempotencyMode: input.idempotencyMode,
      relatedResourceType: input.relatedResourceType ?? null,
      relatedResourceId: input.relatedResourceId ?? null,
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    const [raced] = await db
      .select()
      .from(paymentOperation)
      .where(eq(paymentOperation.operationKey, operationKey))
      .limit(1);
    if (raced) {
      if (raced.requestHash !== input.requestHash)
        throw new Error("PAYMENT_OPERATION_REQUEST_MISMATCH");
      return raced;
    }
    const [activeScope] = input.scopeKey
      ? await db
          .select({ id: paymentOperation.id })
          .from(paymentOperation)
          .where(
            and(
              eq(paymentOperation.scopeKey, input.scopeKey),
              or(
                eq(paymentOperation.status, "pending"),
                eq(paymentOperation.status, "processing"),
                eq(paymentOperation.status, "provider_succeeded"),
              ),
            ),
          )
          .limit(1)
      : [];
    if (activeScope) throw new Error("SUBSCRIPTION_OPERATION_IN_PROGRESS");
    throw new Error("Unable to persist payment operation");
  }
  const [created] = await db
    .select()
    .from(paymentOperation)
    .where(eq(paymentOperation.id, id))
    .limit(1);
  if (!created) throw new Error("Unable to load payment operation");
  return created;
}

export async function claimPaymentOperation(
  db: Database,
  operation: PaymentOperation,
  now = new Date(),
) {
  if (operation.status === "manual_review") throw new Error("PAYMENT_OPERATION_MANUAL_REVIEW");
  if (operation.status === "completed" || operation.status === "provider_succeeded") return null;
  if (operation.status === "processing" && operation.leaseUntil && operation.leaseUntil > now) {
    throw new Error("PAYMENT_OPERATION_IN_PROGRESS");
  }
  if (operation.status === "processing" && operation.idempotencyMode === "local_only") {
    await markPaymentOperationManualReview(
      db,
      operation.id,
      "PAYMENT_OPERATION_PROVIDER_AMBIGUOUS",
      now,
    );
    throw new Error("PAYMENT_OPERATION_MANUAL_REVIEW");
  }
  const token = createLeaseToken();
  const [claimed] = await db
    .update(paymentOperation)
    .set({
      status: "processing",
      leaseToken: token,
      leaseUntil: leaseUntil(now, OPERATION_LEASE_MS),
      attemptCount: sql`${paymentOperation.attemptCount} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(paymentOperation.id, operation.id),
        or(
          eq(paymentOperation.status, "pending"),
          eq(paymentOperation.status, "failed"),
          and(
            eq(paymentOperation.status, "processing"),
            or(isNull(paymentOperation.leaseUntil), lte(paymentOperation.leaseUntil, now)),
          ),
        ),
      ),
    )
    .returning();
  return claimed ? { operation: claimed, token } : null;
}

export async function savePaymentOperationProviderResult(
  db: Database,
  operationId: string,
  token: string,
  result: CheckoutOperationResult,
  now = new Date(),
) {
  const resultJson = JSON.stringify(result);
  checkoutResultSchema.parse(JSON.parse(resultJson));
  return savePaymentOperationProviderSuccess(
    db,
    operationId,
    token,
    result.providerSessionId,
    resultJson,
    now,
  );
}

export async function savePaymentOperationProviderSuccess(
  db: Database,
  operationId: string,
  token: string,
  providerResourceId: string,
  resultJson: string,
  now = new Date(),
) {
  const [updated] = await db
    .update(paymentOperation)
    .set({
      status: "provider_succeeded",
      providerResourceId,
      resultJson,
      leaseUntil: null,
      leaseToken: null,
      retryable: false,
      lastError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(paymentOperation.id, operationId),
        eq(paymentOperation.status, "processing"),
        eq(paymentOperation.leaseToken, token),
      ),
    )
    .returning();
  if (!updated) throw new Error("PAYMENT_OPERATION_PROVIDER_RESULT_CONFLICT");
  return updated;
}

export function readCheckoutOperationResult(operation: PaymentOperation) {
  if (!operation.resultJson) throw new Error("PAYMENT_OPERATION_RESULT_MISSING");
  return checkoutResultSchema.parse(JSON.parse(operation.resultJson));
}

export function readPaymentOperationRequest(operation: PaymentOperation) {
  return requestEnvelopeSchema.parse(JSON.parse(operation.requestJson)).payload;
}

export async function completePaymentOperation(
  db: Database,
  operationId: string,
  now = new Date(),
) {
  await db
    .update(paymentOperation)
    .set({
      status: "completed",
      completedAt: now,
      leaseToken: null,
      leaseUntil: null,
      retryable: false,
      updatedAt: now,
    })
    .where(
      and(eq(paymentOperation.id, operationId), eq(paymentOperation.status, "provider_succeeded")),
    );
}

export async function failPaymentOperation(
  db: Database,
  operationId: string,
  token: string,
  error: unknown,
  localOnly: boolean,
  now = new Date(),
) {
  const message =
    error instanceof Error
      ? error.message.replace(/https?:\/\/\S+/gi, "[url]").slice(0, 500)
      : "Payment provider request failed";
  const [operation] = await db
    .select({ attemptCount: paymentOperation.attemptCount })
    .from(paymentOperation)
    .where(
      and(
        eq(paymentOperation.id, operationId),
        eq(paymentOperation.status, "processing"),
        eq(paymentOperation.leaseToken, token),
      ),
    )
    .limit(1);
  if (!operation) return null;
  const outcome = error instanceof PaymentProviderRequestError ? error.outcome : "unknown";
  const retryable = !localOnly && outcome === "unknown";
  const exhausted = retryable && operation.attemptCount >= MAX_PAYMENT_OPERATION_ATTEMPTS;
  const requiresReview = (localOnly && outcome === "unknown") || exhausted;
  const retryDelay = Math.min(
    PAYMENT_OPERATION_RETRY_BASE_MS * 2 ** Math.max(0, operation.attemptCount - 1),
    PAYMENT_OPERATION_RETRY_MAX_MS,
  );
  await db
    .update(paymentOperation)
    .set({
      status: requiresReview ? "manual_review" : "failed",
      manualReviewCode: requiresReview
        ? localOnly
          ? "PAYMENT_OPERATION_PROVIDER_AMBIGUOUS"
          : "PAYMENT_OPERATION_MAX_ATTEMPTS"
        : null,
      lastError: message,
      leaseToken: null,
      leaseUntil: null,
      retryable: requiresReview ? false : retryable,
      nextRetryAt: retryable && !requiresReview ? new Date(now.getTime() + retryDelay) : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(paymentOperation.id, operationId),
        eq(paymentOperation.status, "processing"),
        eq(paymentOperation.leaseToken, token),
      ),
    );
  return {
    status: requiresReview ? "manual_review" : "failed",
    retryable: retryable && !requiresReview,
  };
}

export async function markPaymentOperationManualReview(
  db: Database,
  operationId: string,
  code: string,
  now = new Date(),
) {
  await db
    .update(paymentOperation)
    .set({
      status: "manual_review",
      manualReviewCode: code,
      leaseToken: null,
      leaseUntil: null,
      retryable: false,
      updatedAt: now,
    })
    .where(and(eq(paymentOperation.id, operationId), lte(paymentOperation.leaseUntil, now)));
}

/** Requeues only states that cannot trigger an unsafe second local-only provider call. */
export async function retryPaymentOperation(db: Database, operationId: string, now = new Date()) {
  const [operation] = await db
    .select()
    .from(paymentOperation)
    .where(eq(paymentOperation.id, operationId))
    .limit(1);
  if (!operation) return false;
  const staleNativeProcessing =
    operation.status === "processing" &&
    operation.idempotencyMode === "native" &&
    (!operation.leaseUntil || operation.leaseUntil <= now);
  if (
    operation.status === "manual_review" ||
    operation.status === "completed" ||
    (operation.status === "processing" && !staleNativeProcessing) ||
    (operation.status === "failed" && !operation.retryable)
  )
    return false;
  await db
    .update(paymentOperation)
    .set({
      status: operation.status === "provider_succeeded" ? "provider_succeeded" : "pending",
      leaseToken: null,
      leaseUntil: null,
      nextRetryAt: now,
      retryable: operation.status === "failed" ? true : false,
      updatedAt: now,
    })
    .where(eq(paymentOperation.id, operationId));
  return true;
}

/** Resolves a manual-review operation without permitting an unsafe duplicate provider call. */
export async function resolvePaymentOperationManualReview(
  db: Database,
  operationId: string,
  resolution: "requeue" | "mark_failed",
  now = new Date(),
) {
  const [operation] = await db
    .select({
      idempotencyMode: paymentOperation.idempotencyMode,
      status: paymentOperation.status,
    })
    .from(paymentOperation)
    .where(eq(paymentOperation.id, operationId))
    .limit(1);

  if (!operation || operation.status !== "manual_review") {
    return { resolved: false, reason: "NOT_IN_MANUAL_REVIEW" as const };
  }
  if (resolution === "requeue" && operation.idempotencyMode !== "native") {
    return { resolved: false, reason: "UNSAFE_NON_IDEMPOTENT_RETRY" as const };
  }

  const [resolved] = await db
    .update(paymentOperation)
    .set({
      status: resolution === "requeue" ? "pending" : "failed",
      manualReviewCode: null,
      lastError: resolution === "mark_failed" ? "Closed after administrator review" : null,
      leaseToken: null,
      leaseUntil: null,
      nextRetryAt: resolution === "requeue" ? now : null,
      retryable: resolution === "requeue",
      updatedAt: now,
    })
    .where(
      and(eq(paymentOperation.id, operationId), eq(paymentOperation.status, "manual_review")),
    )
    .returning({ id: paymentOperation.id });

  return {
    resolved: Boolean(resolved),
    reason: resolved ? null : ("STATUS_CHANGED" as const),
  };
}
