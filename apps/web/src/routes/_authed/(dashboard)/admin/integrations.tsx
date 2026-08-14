import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAdminRouteAccess } from "@/lib/auth/admin-route";

export const Route = createFileRoute("/_authed/(dashboard)/admin/integrations")({
  beforeLoad: async () => {
    await requireAdminRouteAccess();
    throw redirect({ to: "/admin/system", replace: true });
  },
});
