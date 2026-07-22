import { and, eq } from "drizzle-orm";
import type { Database } from "@/db";
import { billableOperation, creditTransaction } from "@/db/schema/credits";
import {
  assertCreditsEnabled,
  assertCreditAccountNotOnBillingHold,
  assertPositiveAmount,
  createAccountGrantUpdate,
  findTransactionBySource,
  runCreditBatch,
} from "./internal";
import { consumeCredits } from "./consume";
import type {
  BeginBillableOperationInput,
  CompleteBillableOperationInput,
  CreditMetadata,
  CreditServiceContext,
  FailBillableOperationInput,
} from "./types";

type OperationRow = typeof billableOperation.$inferSelect;

function assertOperationFields(input: BeginBillableOperationInput) {
  assertPositiveAmount(input.calculatedCost);
  for (const [name, value, min, max] of [
    ["feature", input.feature, 1, 100],
    ["operationId", input.operationId, 8, 120],
    ["requestHash", input.requestHash, 16, 256],
  ] as const) {
    if (value.length < min || value.length > max) {
      throw new Error(`Invalid billable operation ${name}`);
    }
  }
}

function assertMatchingOperation(operation: OperationRow, input: BeginBillableOperationInput) {
  if (
    operation.requestHash !== input.requestHash ||
    operation.calculatedCost !== input.calculatedCost
  ) {
    throw new Error("Billable operation does not match the original request");
  }
}

async function findOperation(
  db: Database,
  input: Pick<BeginBillableOperationInput, "user" | "feature" | "operationId">,
) {
  const [operation] = await db
    .select()
    .from(billableOperation)
    .where(
      and(
        eq(billableOperation.userId, input.user.userId),
        eq(billableOperation.feature, input.feature),
        eq(billableOperation.operationId, input.operationId),
      ),
    )
    .limit(1);
  return operation ?? null;
}

async function claimRunning(db: Database, operation: OperationRow) {
  const claimed = await db
    .update(billableOperation)
    .set({
      status: "running",
      updatedAt: new Date(),
    })
    .where(and(eq(billableOperation.id, operation.id), eq(billableOperation.status, "pending")))
    .run();
  return claimed.meta.changes === 1;
}

/**
 * Authorizes exactly one server-side execution for a paid feature.
 * The caller must compute cost and requestHash after validating untrusted input.
 */
export async function beginBillableOperation(
  db: Database,
  input: BeginBillableOperationInput,
  serviceContext: CreditServiceContext = {},
) {
  assertCreditsEnabled();
  assertOperationFields(input);
  await assertCreditAccountNotOnBillingHold(db, input.user.userId);
  let operation = await findOperation(db, input);

  if (!operation) {
    const now = new Date();
    const id = crypto.randomUUID();
    try {
      await db.insert(billableOperation).values({
        id,
        userId: input.user.userId,
        feature: input.feature,
        operationId: input.operationId,
        requestHash: input.requestHash,
        calculatedCost: input.calculatedCost,
        status: "pending",
        creditTransactionId: null,
        resultReference: null,
        failureReason: null,
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // A concurrent request may have created the same user-scoped operation.
    }
    operation = await findOperation(db, input);
  }

  if (!operation) {
    throw new Error("Unable to create billable operation");
  }
  assertMatchingOperation(operation, input);

  if (operation.status === "succeeded") {
    return { kind: "succeeded" as const, operation };
  }
  if (operation.status === "running") {
    return { kind: "running" as const, operation };
  }
  if (operation.status === "failed" || operation.status === "refunded") {
    return { kind: "failed" as const, operation };
  }

  const usageSource = {
    sourceProvider: "app" as const,
    sourceType: "usage" as const,
    sourceId: operation.id,
  };
  let usage = await findTransactionBySource(db, usageSource);
  if (!usage) {
    try {
      await consumeCredits(
        db,
        {
          user: input.user,
          amount: input.calculatedCost,
          sourceId: operation.id,
          metadata: {
            feature: input.feature,
            operationId: input.operationId,
            requestHash: input.requestHash,
          },
        },
        serviceContext,
      );
    } catch (error) {
      await db
        .update(billableOperation)
        .set({
          status: "failed",
          failureReason: error instanceof Error ? error.message : "Credit authorization failed",
          updatedAt: new Date(),
        })
        .where(
          and(eq(billableOperation.id, operation.id), eq(billableOperation.status, "pending")),
        );
      throw error;
    }
    usage = await findTransactionBySource(db, usageSource);
  }

  if (!usage || usage.userId !== input.user.userId || usage.amount !== -input.calculatedCost) {
    throw new Error("Billable operation usage ledger does not match its authorization");
  }

  await db
    .update(billableOperation)
    .set({ creditTransactionId: usage.id, updatedAt: new Date() })
    .where(eq(billableOperation.id, operation.id));

  if (await claimRunning(db, operation)) {
    return {
      kind: "started" as const,
      operation: { ...operation, status: "running", creditTransactionId: usage.id },
    };
  }

  const current = await findOperation(db, input);
  if (!current) throw new Error("Billable operation disappeared");
  return current.status === "succeeded"
    ? { kind: "succeeded" as const, operation: current }
    : current.status === "running"
      ? { kind: "running" as const, operation: current }
      : { kind: "failed" as const, operation: current };
}

export async function completeBillableOperation(
  db: Database,
  input: CompleteBillableOperationInput,
) {
  const operation = await findOperation(db, input);
  if (!operation) throw new Error("Billable operation was not found");
  if (operation.status === "succeeded") return operation;
  if (operation.status !== "running") throw new Error("Billable operation is not running");
  await db
    .update(billableOperation)
    .set({ status: "succeeded", resultReference: input.resultReference, updatedAt: new Date() })
    .where(and(eq(billableOperation.id, operation.id), eq(billableOperation.status, "running")));
  return (await findOperation(db, input)) ?? operation;
}

/** Compensates a charged operation once when its server-side work fails. */
export async function failBillableOperation(db: Database, input: FailBillableOperationInput) {
  const operation = await findOperation(db, input);
  if (!operation) throw new Error("Billable operation was not found");
  if (
    operation.status === "succeeded" ||
    operation.status === "failed" ||
    operation.status === "refunded"
  ) {
    return operation;
  }

  const refundSource = {
    sourceProvider: "app" as const,
    sourceType: "refund" as const,
    sourceId: operation.id,
  };
  const existingRefund = await findTransactionBySource(db, refundSource);
  if (!existingRefund) {
    const now = new Date();
    const metadata: CreditMetadata = {
      feature: operation.feature,
      operationId: operation.operationId,
      reason: input.failureReason,
    };
    await runCreditBatch(db, [
      db.insert(creditTransaction).values({
        id: crypto.randomUUID(),
        userId: operation.userId,
        amount: operation.calculatedCost,
        remainingAmount: operation.calculatedCost,
        sourceProvider: "app",
        sourceType: "refund",
        sourceId: operation.id,
        packageId: null,
        expiresAt: null,
        metadata,
        createdAt: now,
        updatedAt: now,
      }),
      createAccountGrantUpdate(db, operation.userId, operation.calculatedCost, now),
    ]);
  }

  await db
    .update(billableOperation)
    .set({ status: "refunded", failureReason: input.failureReason, updatedAt: new Date() })
    .where(eq(billableOperation.id, operation.id));
  return (await findOperation(db, input)) ?? operation;
}
