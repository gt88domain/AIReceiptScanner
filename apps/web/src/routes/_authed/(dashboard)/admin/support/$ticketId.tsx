import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminTicketDetailPage } from "@/components/dashboard/tickets/ticket-pages";
import { webConfig } from "@/configs/web-config";
import { requireAdminRouteAccess } from "@/lib/auth/admin-route";

export const Route = createFileRoute("/_authed/(dashboard)/admin/support/$ticketId")({
  beforeLoad: async () => {
    await requireAdminRouteAccess();
    if (!webConfig.ticketsEnabled) throw redirect({ to: "/admin" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <AdminTicketDetailPage ticketId={Route.useParams().ticketId} />;
}
