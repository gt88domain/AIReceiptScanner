import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminPayments } from "@/components/dashboard/admin/admin-payments";
import { webConfig } from "@/configs/web-config";
import { requireAdminRouteAccess } from "@/lib/auth/admin-route";

export const Route = createFileRoute("/_authed/(dashboard)/admin/payments")({
  beforeLoad: async () => {
    await requireAdminRouteAccess();
    if (!webConfig.billingEnabled && !webConfig.creditPurchasesEnabled) {
      throw redirect({ to: "/admin/system" });
    }
  },
  component: AdminPayments,
});
