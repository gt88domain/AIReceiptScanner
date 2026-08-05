import { ORPCError } from "@orpc/server";
import type { Context } from "./context";

/** Fails closed before any storage provider or R2 binding is accessed. */
export function requireStorageService(
  context: Pick<Context, "storage">,
): NonNullable<Context["storage"]> {
  if (!context.storage) {
    throw new ORPCError("NOT_FOUND", {
      message: "Storage is disabled.",
      data: { code: "FEATURE_DISABLED" },
    });
  }
  return context.storage;
}
