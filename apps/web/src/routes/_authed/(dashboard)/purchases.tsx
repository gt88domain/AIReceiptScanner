import { createFileRoute, redirect } from "@tanstack/react-router";
import { PurchasesPage } from "@/components/dashboard/purchases-page";
import { webConfig } from "@/configs/web-config";

export const Route = createFileRoute("/_authed/(dashboard)/purchases")({
  beforeLoad: () => {
    if (!webConfig.billingEnabled && !webConfig.creditPurchasesEnabled) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: PurchasesPage,
});
