import { createFileRoute } from "@tanstack/react-router";
import { HelpPage } from "@/components/dashboard/help-page";

export const Route = createFileRoute("/_authed/(dashboard)/help")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  return <HelpPage user={user} />;
}
