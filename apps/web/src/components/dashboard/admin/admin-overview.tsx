import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon, CreditCardIcon, WebhookIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { webConfig } from "@/configs/web-config";
import { useOrpc } from "@/hooks/use-orpc";
import { AdminPageHeader } from "./admin-page-header";

export function AdminOverview() {
  const orpc = useOrpc();
  const system = useQuery(orpc.admin.getSystem.queryOptions());
  const migrations = useQuery(orpc.admin.getMigrationStatus.queryOptions());
  const paymentEnabled = webConfig.billingEnabled || webConfig.creditPurchasesEnabled;
  const billing = useQuery({ ...orpc.admin.overview.queryOptions(), enabled: paymentEnabled });
  const operations = useQuery({
    ...orpc.admin.listPaymentOperations.queryOptions({ input: {} }),
    enabled: paymentEnabled,
  });
  const tickets = useQuery({
    ...orpc.tickets.countOpenAdmin.queryOptions(),
    enabled: webConfig.ticketsEnabled,
  });

  if (
    system.isPending ||
    migrations.isPending ||
    (paymentEnabled && (billing.isPending || operations.isPending)) ||
    (webConfig.ticketsEnabled && tickets.isPending)
  ) {
    return <OverviewSkeleton />;
  }

  const failedWebhooks = billing.isError
    ? "Unavailable"
    : (billing.data?.stats.failedWebhooks ?? 0);
  const failedPayments = (operations.data ?? []).filter(
    (operation) => operation.status === "failed" || operation.status === "manual_review",
  ).length;
  const items = [
    {
      title: "Open support tickets",
      count: tickets.isError ? "Unavailable" : (tickets.data?.count ?? 0),
      description: "Customer questions waiting for an administrator response.",
      to: "/admin/support" as const,
      visible: webConfig.ticketsEnabled,
      icon: CircleAlertIcon,
    },
    {
      title: "Failed or dead-letter webhooks",
      count: failedWebhooks,
      description: paymentEnabled
        ? "Webhook deliveries that need provider-side review."
        : "Payments are not enabled for this profile.",
      to: "/admin/payments" as const,
      visible: paymentEnabled,
      icon: WebhookIcon,
    },
    {
      title: "Failed payment operations",
      count: operations.isError ? "Unavailable" : failedPayments,
      description: paymentEnabled
        ? "Checkout or subscription operations requiring attention."
        : "Payments are not enabled for this profile.",
      to: "/admin/payments" as const,
      visible: paymentEnabled,
      icon: CreditCardIcon,
    },
    {
      title: "Database migrations",
      count: migrations.data?.available ? 0 : 1,
      description: migrations.data?.available
        ? `${migrations.data.applied} migrations recorded in the D1 ledger.`
        : "No migration ledger is available for this runtime.",
      to: "/admin/system" as const,
      visible: true,
      icon: migrations.data?.available ? CheckCircle2Icon : CircleAlertIcon,
    },
    {
      title: "Runtime status",
      count: system.isError ? 1 : 0,
      description: system.isError
        ? "The runtime read model could not be loaded."
        : "Configuration and migration state are available in System.",
      to: "/admin/system" as const,
      visible: true,
      icon: system.isError ? CircleAlertIcon : CheckCircle2Icon,
    },
  ].filter((item) => item.visible);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Small, read-only queue for issues that need a human check."
        title="Administration"
      />
      <section className="grid gap-4 lg:grid-cols-4">
        {items.map(({ count, description, icon: Icon, title, to }) => (
          <Card key={title}>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
              <Icon className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Link className="font-semibold text-2xl tabular-nums hover:underline" to={to}>
                {count}
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
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
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-36" key={index} />
        ))}
      </div>
    </div>
  );
}
