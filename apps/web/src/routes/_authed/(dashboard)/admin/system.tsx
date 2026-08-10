import { createFileRoute } from "@tanstack/react-router";
import { AdminSystem } from "@/components/dashboard/admin/admin-system";
import { requireAdminRouteAccess } from "@/lib/auth/admin-route";

export const Route = createFileRoute("/_authed/(dashboard)/admin/system")({
  beforeLoad: requireAdminRouteAccess,
  component: AdminSystem,
});
