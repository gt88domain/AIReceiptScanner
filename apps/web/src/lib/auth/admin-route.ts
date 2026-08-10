import { redirect } from "@tanstack/react-router";
import { webConfig } from "@/configs/web-config";
import { getAdminAccess } from "./auth-server";

/** Shared server-side guard for every administration route. */
export async function requireAdminRouteAccess() {
  if (!webConfig.adminEnabled) {
    throw redirect({ to: "/dashboard" });
  }
  const { isAdmin } = await getAdminAccess();
  if (!isAdmin) {
    throw redirect({ to: "/dashboard" });
  }
}
