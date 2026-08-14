import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAdminRouteAccess } from "@/lib/auth/admin-route";

export const Route = createFileRoute("/_authed/(dashboard)/admin")({
  beforeLoad: requireAdminRouteAccess,
  component: Outlet,
});
