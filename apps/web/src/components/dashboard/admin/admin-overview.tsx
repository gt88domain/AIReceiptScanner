import { useQuery } from "@tanstack/react-query";
import { CreditCardIcon, UsersIcon, WebhookIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { webConfig } from "@/configs/web-config";
import { useOrpc } from "@/hooks/use-orpc";
import { AdminMetricCard } from "./admin-metric-card";
import { AdminPageHeader } from "./admin-page-header";

export function AdminOverview() {
  const orpc = useOrpc();
  const users = useQuery(orpc.admin.getUserSummary.queryOptions());
  const billing = useQuery({
    ...orpc.admin.overview.queryOptions(),
    enabled: webConfig.billingEnabled,
  });

  if (users.isPending || (webConfig.billingEnabled && billing.isPending)) {
    return <OverviewSkeleton />;
  }

  if (users.isError || billing.isError) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          description="Platform overview and operational status."
          title="Administration"
        />
        <Card>
          <CardContent className="py-6 text-muted-foreground text-sm">
            Administration data could not be loaded. Refresh the page to try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  const overview = billing.data;
  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Platform overview and operational status."
        title="Administration"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard icon={UsersIcon} label="Users" value={users.data.users} />
        {overview ? (
          <>
            <AdminMetricCard
              icon={CreditCardIcon}
              label="Active subscriptions"
              value={overview.stats.activeSubscriptions}
            />
            <AdminMetricCard
              icon={CreditCardIcon}
              label="Successful purchases"
              value={overview.stats.successfulPurchases}
            />
            <AdminMetricCard
              icon={WebhookIcon}
              label="Pending webhooks"
              value={overview.stats.pendingWebhooks}
            />
          </>
        ) : null}
      </div>

      {overview ? (
        <BillingSummary
          purchase={overview.purchases.at(0)}
          subscription={overview.subscriptions.at(0)}
        />
      ) : null}
    </div>
  );
}

function BillingSummary({
  subscription,
  purchase,
}: {
  subscription: { email: string | null; status: string } | undefined;
  purchase: { email: string | null; status: string } | undefined;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent billing activity</CardTitle>
        <CardDescription>Latest processed subscription and purchase records.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <ActivityItem
          label="Subscription"
          value={
            subscription
              ? `${subscription.email ?? "Unknown user"} · ${subscription.status}`
              : "No subscription records."
          }
        />
        <ActivityItem
          label="Purchase"
          value={
            purchase
              ? `${purchase.email ?? "Unknown user"} · ${purchase.status}`
              : "No purchase records."
          }
        />
      </CardContent>
    </Card>
  );
}

function ActivityItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 pl-3">
      <p className="font-medium text-sm">{label}</p>
      <p className="mt-1 text-muted-foreground text-sm">{value}</p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b pb-6">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-32" key={index} />
        ))}
      </div>
    </div>
  );
}
