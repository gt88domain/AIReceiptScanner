import { describe, expect, it, vi } from "vitest";
import { createPaymentOperationError } from "@/lib/payment-operation-error";

describe("payment operation errors", () => {
  it("keeps provider details in logs and out of the client response", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const providerError = new Error("Stripe customer cus_secret and price price_secret failed");

    const error = createPaymentOperationError("CHECKOUT_CREATION_FAILED", providerError);

    expect(error).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      data: { code: "CHECKOUT_CREATION_FAILED", traceId: expect.any(String) },
      message: "Payment service is temporarily unavailable. Please try again.",
    });
    expect(error.message).not.toContain("cus_secret");
    expect(errorLog).toHaveBeenCalledWith(
      "Payment operation failed",
      expect.objectContaining({
        code: "CHECKOUT_CREATION_FAILED",
        error: providerError.message,
        traceId: expect.any(String),
      }),
    );
    errorLog.mockRestore();
  });
});
