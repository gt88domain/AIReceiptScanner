import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BoxesIcon,
  CircleGaugeIcon,
  DatabaseIcon,
  ListChecksIcon,
  ServerCogIcon,
  Loader2Icon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrpc } from "@/hooks/use-orpc";
import { AdminEmptyState } from "./admin-empty-state";
import { AdminIntegrations } from "./admin-integrations";
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
  const migrations = useQuery(orpc.admin.getMigrationStatus.queryOptions());

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
          <section className="grid gap-4 md:grid-cols-3">
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
                <CardTitle>Database migrations</CardTitle>
                <CardDescription>Applied migration ledger for this D1 database.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {migrations.isError ? (
                  <Definition label="State" value="Unavailable" />
                ) : migrations.data && !migrations.data.available ? (
                  <Definition label="State" value="No migration ledger recorded" />
                ) : (
                  <>
                    <Definition
                      label="Applied"
                      value={migrations.isPending ? "Loading…" : (migrations.data?.applied ?? 0)}
                    />
                    <Definition
                      label="Latest applied"
                      value={
                        migrations.data?.latestAppliedAt
                          ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
                              migrations.data.latestAppliedAt,
                            )
                          : "No migrations recorded"
                      }
                    />
                  </>
                )}
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
          <section className="space-y-4">
            <div>
              <h2 className="font-semibold text-lg">Providers</h2>
              <p className="text-muted-foreground text-sm">
                Configuration state only; credentials and provider identifiers are never shown.
              </p>
            </div>
            <AdminIntegrations embedded />
          </section>
          {system.data.modules.some((module) => module.id === "jobs" && module.enabled) ? (
            <FailedJobsPanel />
          ) : null}
        </>
      )}
    </div>
  );
}

function FailedJobsPanel() {
  const orpc = useOrpc();
  const failedJobs = useQuery(
    orpc.admin.listFailedJobs.queryOptions({ input: { page: 1, perPage: 50 } }),
  );
  const retryJob = useMutation({
    ...orpc.admin.retryFailedJob.mutationOptions(),
    onSuccess: async ({ retried }) => {
      if (retried) {
        toast.success("Failed job queued for retry.");
        await failedJobs.refetch();
      } else {
        toast.error("This failed job is no longer retryable.");
      }
    },
    onError: () => toast.error("Failed job retry could not be started."),
  });
  const ignoreJob = useMutation({
    ...orpc.admin.ignoreFailedJob.mutationOptions(),
    onSuccess: async ({ ignored }) => {
      if (ignored) {
        toast.success("Failed job ignored.");
        await failedJobs.refetch();
      } else {
        toast.error("This failed job was already resolved.");
      }
    },
    onError: () => toast.error("Failed job could not be ignored."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Failed jobs</CardTitle>
        <CardDescription>Retry or dismiss jobs that exhausted automatic delivery.</CardDescription>
      </CardHeader>
      <CardContent>
        {failedJobs.isPending ? <Skeleton className="h-36 w-full" /> : null}
        {failedJobs.isError ? (
          <AdminEmptyState
            description="Failed jobs could not be loaded."
            icon={ListChecksIcon}
            title="Jobs unavailable"
          />
        ) : null}
        {failedJobs.data?.data.length === 0 ? (
          <AdminEmptyState
            description="No failed jobs require attention."
            icon={ListChecksIcon}
            title="No failed jobs"
          />
        ) : null}
        {failedJobs.data?.data.length ? (
          <div className="divide-y">
            {failedJobs.data.data.map((event) => (
              <div className="flex flex-wrap items-center justify-between gap-4 py-3" key={event.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{event.jobType}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.attempts} attempts · {formatDateTime(event.failedAt)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-destructive">{event.error}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={retryJob.isPending || ignoreJob.isPending}
                    onClick={() => retryJob.mutate({ id: event.id })}
                    size="sm"
                    variant="outline"
                  >
                    {retryJob.isPending && retryJob.variables?.id === event.id ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <RotateCcwIcon className="size-4" />
                    )}
                    Retry
                  </Button>
                  <Button
                    disabled={retryJob.isPending || ignoreJob.isPending}
                    onClick={() => ignoreJob.mutate({ id: event.id })}
                    size="sm"
                    variant="outline"
                  >
                    {ignoreJob.isPending && ignoreJob.variables?.id === event.id ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <Trash2Icon className="size-4" />
                    )}
                    Ignore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    value,
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
