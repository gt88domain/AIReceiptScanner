import { useQuery } from "@tanstack/react-query";
import {
  BoxesIcon,
  CircleGaugeIcon,
  DatabaseIcon,
  ListChecksIcon,
  ServerCogIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrpc } from "@/hooks/use-orpc";
import { AdminEmptyState } from "./admin-empty-state";
import { AdminPageHeader } from "./admin-page-header";
import { AdminStatusBadge } from "./admin-status-badge";

const resourceIcons = {
  d1: DatabaseIcon,
  r2: BoxesIcon,
  queue: ListChecksIcon,
} as const;

export function AdminSystem() {
  const orpc = useOrpc();
  const system = useQuery(orpc.admin.getSystem.queryOptions());

  if (system.isPending) return <SystemSkeleton />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Runtime composition and a small operational summary. Detailed infrastructure metrics and logs remain in Cloudflare."
        title="System"
      />
      {system.isError || !system.data ? (
        <AdminEmptyState
          description="The runtime summary could not be loaded. Refresh the page to try again."
          icon={ServerCogIcon}
          title="System unavailable"
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Application</CardTitle>
                <CardDescription>
                  Safe runtime identifiers for this deployed template.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Definition
                  label="Template version"
                  value={system.data.application.templateVersion}
                />
                <Definition label="Environment" value={system.data.application.environment} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Operational</CardTitle>
                <CardDescription>
                  Counts only; use Cloudflare for detailed diagnostics.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Definition
                  label="Failed jobs"
                  value={system.data.operational.failedJobs ?? "Disabled"}
                />
                <Definition
                  label="Pending webhooks"
                  value={system.data.operational.pendingWebhooks ?? "Disabled"}
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Modules</CardTitle>
                <CardDescription>Resolved from the platform composition.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {system.data.modules.map((module) => (
                  <StatusRow
                    key={module.id}
                    label={module.id}
                    status={module.enabled ? "configured" : "disabled"}
                  />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
                <CardDescription>
                  Required runtime resources, without identifiers or credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {system.data.resources.map((resource) => {
                  const Icon = resourceIcons[resource.id];
                  return (
                    <StatusRow
                      icon={Icon}
                      key={resource.id}
                      label={resource.id}
                      status={resource.status}
                    />
                  );
                })}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Definition({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-medium text-sm tabular-nums">{value}</p>
    </div>
  );
}

function StatusRow({
  label,
  status,
  icon: Icon,
}: {
  label: string;
  status: "configured" | "disabled" | "missing";
  icon?: typeof CircleGaugeIcon;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 font-medium text-sm capitalize">
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
        {label}
      </div>
      <AdminStatusBadge status={status} />
    </div>
  );
}

function SystemSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b pb-6">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
