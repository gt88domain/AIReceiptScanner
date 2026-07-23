# Billable operations

Credits are authorized only inside a server-side product operation. Do not expose a generic
`credits.consume` procedure and never accept a client-supplied amount or ledger metadata.

Each paid endpoint validates its input, calculates its own cost, hashes the normalized request,
then calls `context.credits.beginBillableOperation`. Only the request that receives `started` may
perform work. A retry receives `running` or `succeeded` and must return the stored result instead
of executing again.

```ts
const operation = await context.credits.beginBillableOperation({
  user: { userId: context.session.user.id },
  feature: "image.generate",
  operationId: input.operationId,
  requestHash: await hashValidatedInput(input),
  calculatedCost: calculateImageCost(input),
});

if (operation.kind === "succeeded") return loadExistingResult(operation.operation.resultReference);
if (operation.kind === "running") throw new Error("Operation is already running");
if (operation.kind === "failed") throw new Error("Use a new operation ID after a failed operation");

try {
  const result = await generateImage(input);
  await context.credits.completeBillableOperation({
    user: { userId: context.session.user.id },
    feature: "image.generate",
    operationId: input.operationId,
    resultReference: result.id,
  });
  return result;
} catch (error) {
  await context.credits.failBillableOperation({
    user: { userId: context.session.user.id },
    feature: "image.generate",
    operationId: input.operationId,
    failureReason: "generation_failed",
  });
  throw error;
}
```

`billable_operation` is unique on `(user_id, feature, operation_id)`. It stores the server-calculated
cost and request hash, while its ledger usage source is a server-generated operation UUID. Provider
transaction IDs remain provider-global and are not reused as app-operation IDs.
