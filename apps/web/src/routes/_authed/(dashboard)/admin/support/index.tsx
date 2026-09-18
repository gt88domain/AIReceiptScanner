import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminTicketsPage } from "@/components/dashboard/tickets/ticket-pages";
import { webConfig } from "@/configs/web-config";
import { requireAdminRouteAccess } from "@/lib/auth/admin-route";

export const Route = createFileRoute("/_authed/(dashboard)/admin/support/")({
  beforeLoad: async () => {
    await requireAdminRouteAccess();
    if (!webConfig.ticketsEnabled) throw redirect({ to: "/admin" });
  },
  component: AdminTicketsPage,
});
