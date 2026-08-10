import { createFileRoute } from "@tanstack/react-router";
import { AdminOverview } from "@/components/dashboard/admin/admin-overview";
import { requireAdminRouteAccess } from "@/lib/auth/admin-route";

export const Route = createFileRoute("/_authed/(dashboard)/admin")({
  beforeLoad: requireAdminRouteAccess,
  component: AdminOverview,
});
