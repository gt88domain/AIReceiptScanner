import { createFileRoute } from "@tanstack/react-router";
import { AdminIntegrations } from "@/components/dashboard/admin/admin-integrations";
import { requireAdminRouteAccess } from "@/lib/auth/admin-route";

export const Route = createFileRoute("/_authed/(dashboard)/admin/integrations")({
  beforeLoad: requireAdminRouteAccess,
  component: AdminIntegrations,
});
