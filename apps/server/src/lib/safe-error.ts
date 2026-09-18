import { ORPCError } from "@orpc/server";

const maxErrorTextLength = 1_000;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const urlPattern = /\bhttps?:\/\/[^\s)\]}>,]+/gi;
const secretPattern =
  /\b(?:authorization|cookie|token|secret|api[_-]?key|password)\b\s*[:=]\s*[^\s,;]+/gi;
const bearerPattern = /\bbearer\s+[^\s,;]+/gi;

/** Removes common credentials and personal identifiers before an error reaches a log sink. */
export function redactErrorText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(emailPattern, "[redacted-email]")
    .replace(urlPattern, "[redacted-url]")
    .replace(bearerPattern, "Bearer [redacted-secret]")
    .replace(secretPattern, "[redacted-secret]")
    .slice(0, maxErrorTextLength);
}

export function createTraceId() {
  return crypto.randomUUID();
}

/** Emits a bounded, structured error record without preserving a raw error object. */
export function logSafeError(
  event: string,
  error: unknown,
  details: Record<string, string | number | boolean | undefined> = {},
) {
  const traceId = createTraceId();
  console.error(event, {
    ...details,
    error: redactErrorText(error instanceof Error ? error.message : String(error)),
    name: error instanceof Error ? error.name : "UnknownError",
    traceId,
  });
  return traceId;
}

/** Converts unexpected procedure failures into the stable public oRPC contract. */
export function createSafeOrpcError(error: unknown) {
  if (error instanceof ORPCError) return error;
  const traceId = logSafeError("oRPC request failed", error);
  return new ORPCError("INTERNAL_SERVER_ERROR", {
    data: { code: "INTERNAL_ERROR", traceId },
    message: "The request could not be completed. Please try again.",
  });
}
