import { createFileRoute } from "@tanstack/react-router";
import { AdminOverview } from "@/components/dashboard/admin/admin-overview";

export const Route = createFileRoute("/_authed/(dashboard)/admin/")({
  component: AdminOverview,
});
