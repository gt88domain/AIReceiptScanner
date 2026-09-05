import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "./auth-server";

export function sanitizeReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  if (value.includes("\\") || value.includes("://")) return undefined;
  return value;
}

export function resolvePostAuthReturnTo(search: {
  returnTo?: unknown;
  planId?: unknown;
  priceId?: unknown;
}): string | undefined {
  const explicitReturnTo = sanitizeReturnTo(search.returnTo);
  if (explicitReturnTo) return explicitReturnTo;

  if (
    typeof search.planId !== "string" ||
    search.planId.length === 0 ||
    typeof search.priceId !== "string" ||
    search.priceId.length === 0
  ) {
    return undefined;
  }

  const query = new URLSearchParams({ planId: search.planId, priceId: search.priceId });
  return `/settings/billing?${query.toString()}`;
}

export async function requireAuthenticatedUser(returnTo: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw redirect({
      to: "/auth/sign-in",
      search: { returnTo: sanitizeReturnTo(returnTo) },
    });
  }
  return { user };
}
