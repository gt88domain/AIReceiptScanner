import { createFileRoute } from "@tanstack/react-router";
import { AuthenticatedLayout } from "@/components/dashboard/authed-layout";
import { AuthenticatedQueryCacheGuard } from "@/components/providers/authenticated-query-cache-guard";
import { requireAuthenticatedUser } from "@/lib/auth/require-user";

export const Route = createFileRoute("/_authed/(dashboard)")({
  beforeLoad: ({ location }) => requireAuthenticatedUser(location.href),
  component: () => (
    <>
      <AuthenticatedQueryCacheGuard />
      <AuthenticatedLayout />
    </>
  ),
});
