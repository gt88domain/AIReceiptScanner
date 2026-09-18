import { ORPCError } from "@orpc/server";
import type { Context } from "./context";

/** Fails closed before any Jobs repository or Queue access. */
export function requireJobsService(context: Pick<Context, "jobs">): NonNullable<Context["jobs"]> {
  if (!context.jobs) {
    throw new ORPCError("NOT_FOUND", {
      message: "Jobs are disabled.",
      data: { code: "FEATURE_DISABLED" },
    });
  }
  return context.jobs;
}
