import { ORPCError } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";
import { createSafeOrpcError, logSafeError } from "@/lib/safe-error";

describe("safe public errors", () => {
  it("redacts provider details and gives unexpected oRPC failures a trace ID", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const providerError = new Error(
      "reader@example.test failed at https://provider.test/reset?token=very-secret token=very-secret",
    );

    const error = createSafeOrpcError(providerError);

    expect(error).toBeInstanceOf(ORPCError);
    expect(error).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      data: { code: "INTERNAL_ERROR", traceId: expect.any(String) },
      message: "The request could not be completed. Please try again.",
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("reader@example.test");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("provider.test");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("very-secret");
    errorLog.mockRestore();
  });

  it("does not wrap public oRPC errors", () => {
    const expected = new ORPCError("FORBIDDEN");
    expect(createSafeOrpcError(expected)).toBe(expected);
  });

  it("creates a structured trace ID for HTTP and provider error logging", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(logSafeError("test", new Error("cookie=hidden"))).toEqual(expect.any(String));
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("hidden");
    errorLog.mockRestore();
  });
});
