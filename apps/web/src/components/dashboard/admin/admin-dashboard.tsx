import { useQuery } from "@tanstack/react-query";
import { CreditCard, Users, Webhook } from "lucide-react";
import { AdminUsersTableContainer } from "@/components/dashboard/users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrpc } from "@/hooks/use-orpc";
import { authClient } from "@/lib/auth/auth-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: Date | null) {
  return value ? dateTimeFormatter.format(value) : "—";
}

export function AdminDashboard() {
  const orpc = useOrpc();
  const { data: session } = authClient.useSession();
  const overview = useQuery({
    ...orpc.admin.overview.queryOptions(),
    queryKey: ["admin", "overview", session?.user.id],
    enabled: Boolean(session?.user.id),
  });

  if (overview.isPending || !overview.data) {
    return <Skeleton className="h-96 w-full" />;
  }

  const { stats } = overview.data;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administrator</h1>
        <p className="mt-2 text-muted-foreground">
          Read-only operational data. Billing access comes only from provider webhooks.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Users} label="Registered users" value={stats.users} />
        <MetricCard
          icon={CreditCard}
          label="Active subscriptions"
          value={stats.activeSubscriptions}
        />
        <MetricCard
          icon={CreditCard}
          label="Successful purchases"
          value={stats.successfulPurchases}
        />
        <MetricCard icon={Webhook} label="Pending webhooks" value={stats.pendingWebhooks} />
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminTable
          columns={["User", "Provider", "Plan", "Status", "Period end"]}
          description="Most recently updated subscriptions"
          empty="No subscription records."
          title="Subscription status"
        >
          {overview.data.subscriptions.map((subscription) => (
            <TableRow key={subscription.id}>
              <TableCell>{subscription.email ?? "Unknown user"}</TableCell>
              <TableCell>{subscription.provider}</TableCell>
              <TableCell>{subscription.planId}</TableCell>
              <TableCell>{subscription.status}</TableCell>
              <TableCell>{formatDate(subscription.currentPeriodEnd)}</TableCell>
            </TableRow>
          ))}
        </AdminTable>
        <AdminTable
          columns={["User", "Provider", "Plan", "Status", "Paid at"]}
          description="Most recently updated one-time purchases"
          empty="No purchase records."
          title="Purchase status"
        >
          {overview.data.purchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell>{purchase.email ?? "Unknown user"}</TableCell>
              <TableCell>{purchase.provider}</TableCell>
              <TableCell>{purchase.planId}</TableCell>
              <TableCell>{purchase.status}</TableCell>
              <TableCell>{formatDate(purchase.paidAt)}</TableCell>
            </TableRow>
          ))}
        </AdminTable>
      </section>

      <AdminTable
        columns={["Provider", "Event", "Status", "Attempts", "Last attempted", "Last error"]}
        description="Provider event time is retained separately from this service's handling timeline."
        empty="No webhook events."
        title="Webhook status"
      >
        {overview.data.webhooks.map((webhook) => (
          <TableRow key={webhook.id}>
            <TableCell>{webhook.provider}</TableCell>
            <TableCell>{webhook.eventType}</TableCell>
            <TableCell>{webhook.processingStatus}</TableCell>
            <TableCell>{webhook.attemptCount}</TableCell>
            <TableCell>{formatDate(webhook.lastAttemptAt)}</TableCell>
            <TableCell className="max-w-sm whitespace-normal break-words">
              {webhook.lastError ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </AdminTable>

      <AdminUsersTableContainer />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <Icon className="size-5 text-muted-foreground" />
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function AdminTable({
  columns,
  title,
  description,
  empty,
  children,
}: {
  columns: string[];
  title: string;
  description: string;
  empty: string;
  children: React.ReactNode;
}) {
  const rows = Array.isArray(children) ? children : [children];
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows
            ) : (
              <TableRow>
                <TableCell
                  className="h-20 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
