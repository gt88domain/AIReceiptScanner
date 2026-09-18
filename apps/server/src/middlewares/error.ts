import { HTTPException } from "hono/http-exception";
import type { ErrorHandler } from "hono";
import { logSafeError } from "../lib/safe-error";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  const traceId = logSafeError("Unhandled request error", err, { path: c.req.path });
  return c.json(
    {
      error: "Internal Server Error",
      code: "INTERNAL_ERROR",
      traceId,
    },
    500,
  );
};
