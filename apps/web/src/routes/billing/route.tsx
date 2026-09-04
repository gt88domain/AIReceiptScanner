import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuthenticatedUser } from "@/lib/auth/require-user";

export const Route = createFileRoute("/billing")({
  beforeLoad: ({ location }) => requireAuthenticatedUser(location.href),
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
