import { createFileRoute, redirect } from "@tanstack/react-router";
import { MyTicketDetailPage } from "@/components/dashboard/tickets/ticket-pages";
import { webConfig } from "@/configs/web-config";

export const Route = createFileRoute("/_authed/(dashboard)/tickets/$ticketId")({
  beforeLoad: () => {
    if (!webConfig.ticketsEnabled) throw redirect({ to: "/help" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <MyTicketDetailPage ticketId={Route.useParams().ticketId} />;
}
