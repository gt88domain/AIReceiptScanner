import { createFileRoute } from "@tanstack/react-router";
import { MyTicketsPage } from "@/components/dashboard/tickets/ticket-pages";
import { webConfig } from "@/configs/web-config";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/(dashboard)/tickets/")({
  beforeLoad: () => {
    if (!webConfig.ticketsEnabled) throw redirect({ to: "/help" });
  },
  component: MyTicketsPage,
});
