import { useQuery } from "@tanstack/react-query";
import {
  ActivityIcon,
  CreditCardIcon,
  DatabaseIcon,
  ListChecksIcon,
  UsersIcon,
  WebhookIcon,
} from "lucide-react";
import { useState } from "react";
import { AdminEmptyState } from "@/components/dashboard/admin/admin-empty-state";
import { AdminMetricCard } from "@/components/dashboard/admin/admin-metric-card";
import { AdminPageHeader } from "@/components/dashboard/admin/admin-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useOrpc } from "@/hooks/use-orpc";

type AnalyticsWindow = "7d" | "30d" | "90d" | "all";

const windows: ReadonlyArray<{ id: AnalyticsWindow; label: string }> = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All" },
];

export function AdminAnalytics() {
  const orpc = useOrpc();
  const [window, setWindow] = useState<AnalyticsWindow>("30d");
  const analytics = useQuery(orpc.admin.getAnalytics.queryOptions({ input: { window } }));
  const windowLabel = windows.find((item) => item.id === window)?.label ?? window;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        description="Platform business metrics from existing application data. Infrastructure metrics and logs remain in Cloudflare."
        title="Analytics"
      />

      <ToggleGroup
        aria-label="Analytics time window"
        onValueChange={(value) => {
          if (value) setWindow(value as AnalyticsWindow);
        }}
        size="sm"
        type="single"
        value={window}
        variant="outline"
      >
        {windows.map((item) => (
          <ToggleGroupItem key={item.id} value={item.id}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {analytics.isPending ? <AnalyticsSkeleton /> : null}
      {analytics.isError || !analytics.data ? (
        <AdminEmptyState
          description="The aggregate analytics summary could not be loaded. Refresh the page to try again."
          icon={ActivityIcon}
          title="Analytics unavailable"
        />
      ) : null}
      {analytics.data ? (
        <div className="space-y-8">
          <MetricSection title="Users">
            <AdminMetricCard
              description="All-time, excluding deleted accounts"
              icon={UsersIcon}
              label="Total users"
              value={analytics.data.users.total}
            />
            <AdminMetricCard
              description={`${windowLabel} registration window`}
              icon={UsersIcon}
              label="New users"
              value={analytics.data.users.new}
            />
          </MetricSection>

          {analytics.data.billing ? (
            <MetricSection title="Billing">
              <AdminMetricCard
                description="Current subscription status"
                icon={CreditCardIcon}
                label="Active subscriptions"
                value={analytics.data.billing.activeSubscriptions}
              />
              <AdminMetricCard
                description={`${windowLabel} successful payments`}
                icon={CreditCardIcon}
                label="Successful purchases"
                value={analytics.data.billing.successfulPurchases}
              />
            </MetricSection>
          ) : null}

          {analytics.data.credits ? (
            <MetricSection title="Credits">
              <AdminMetricCard
                description="All-time account aggregate"
                icon={DatabaseIcon}
                label="Granted"
                value={analytics.data.credits.granted}
              />
              <AdminMetricCard
                description="All-time account aggregate"
                icon={DatabaseIcon}
                label="Consumed"
                value={analytics.data.credits.consumed}
              />
              <AdminMetricCard
                description={`Revoked ${analytics.data.credits.revoked} · Restored ${analytics.data.credits.restored}`}
                icon={DatabaseIcon}
                label="Recovery adjustments"
                value={analytics.data.credits.revoked + analytics.data.credits.restored}
              />
            </MetricSection>
          ) : null}

          {analytics.data.operations.jobs || analytics.data.operations.webhooks ? (
            <MetricSection title="Operations">
              {analytics.data.operations.jobs ? (
                <>
                  <AdminMetricCard
                    description="Current queue state"
                    icon={ListChecksIcon}
                    label="Pending jobs"
                    value={analytics.data.operations.jobs.pending}
                  />
                  <AdminMetricCard
                    description="Current queue state"
                    icon={ListChecksIcon}
                    label="Failed jobs"
                    value={analytics.data.operations.jobs.failed}
                  />
                </>
              ) : null}
              {analytics.data.operations.webhooks ? (
                <>
                  <AdminMetricCard
                    description="Current processing state"
                    icon={WebhookIcon}
                    label="Pending webhooks"
                    value={analytics.data.operations.webhooks.pending}
                  />
                  <AdminMetricCard
                    description="Current processing state"
                    icon={WebhookIcon}
                    label="Dead-lettered webhooks"
                    value={analytics.data.operations.webhooks.deadLettered}
                  />
                </>
              ) : null}
            </MetricSection>
          ) : null}

          <MetricSection title="Audit">
            <AdminMetricCard
              description="All-time administrator mutations"
              icon={ActivityIcon}
              label="Administrative changes"
              value={analytics.data.audit.changes}
            />
          </MetricSection>
        </div>
      ) : null}

      <p className="border-t pt-6 text-muted-foreground text-sm">
        Traffic, request, runtime and infrastructure metrics are managed in Cloudflare.
      </p>
    </div>
  );
}

function MetricSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-base">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 4 }, (_, section) => (
        <section className="space-y-3" key={section}>
          <Skeleton className="h-5 w-24" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton className="h-32" key={index} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
