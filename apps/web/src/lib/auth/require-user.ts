import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "./auth-server";

export function sanitizeReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  if (value.includes("\\") || value.includes("://")) return undefined;
  return value;
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
