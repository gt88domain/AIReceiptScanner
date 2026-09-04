import { useQuery } from "@tanstack/react-query";
import {
  BoxesIcon,
  CreditCardIcon,
  DatabaseIcon,
  GithubIcon,
  InboxIcon,
  KeyRoundIcon,
  MailIcon,
  SearchIcon,
  ServerCogIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrpc } from "@/hooks/use-orpc";
import { AdminEmptyState } from "./admin-empty-state";
import { AdminPageHeader } from "./admin-page-header";
import { AdminStatusBadge } from "./admin-status-badge";

const integrationDetails = {
  d1: { name: "Cloudflare D1", description: "Application database", icon: DatabaseIcon },
  r2: { name: "Cloudflare R2", description: "Private asset storage", icon: BoxesIcon },
  queue: { name: "Cloudflare Queue", description: "Background job delivery", icon: InboxIcon },
  github: { name: "GitHub", description: "OAuth sign-in provider", icon: GithubIcon },
  google: { name: "Google", description: "OAuth sign-in provider", icon: KeyRoundIcon },
  apple: { name: "Apple", description: "OAuth sign-in provider", icon: KeyRoundIcon },
  stripe: { name: "Stripe", description: "Web billing provider", icon: CreditCardIcon },
  revenuecat: { name: "RevenueCat", description: "Native billing provider", icon: CreditCardIcon },
  resend: { name: "Resend", description: "Transactional email delivery", icon: MailIcon },
} as const;

type Filter = "all" | "configured" | "disabled" | "missing";

export function AdminIntegrations({ embedded = false }: { embedded?: boolean }) {
  const orpc = useOrpc();
  const integrations = useQuery(orpc.admin.getIntegrations.queryOptions());
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const visibleIntegrations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (integrations.data ?? []).filter((integration) => {
      const details = integrationDetails[integration.id as keyof typeof integrationDetails];
      if (!details) return false;
      return (
        (filter === "all" || integration.status === filter) &&
        (!normalizedSearch ||
          details.name.toLowerCase().includes(normalizedSearch) ||
          details.description.toLowerCase().includes(normalizedSearch))
      );
    });
  }, [filter, integrations.data, search]);

  return (
    <div className="space-y-6">
      {!embedded ? (
        <AdminPageHeader
          description="Platform services and configured providers. Configuration state only; no credentials are shown."
          title="Providers"
        />
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search integrations"
            value={search}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "configured", "disabled", "missing"] as const).map((option) => (
            <Button
              key={option}
              onClick={() => setFilter(option)}
              size="sm"
              variant={filter === option ? "secondary" : "outline"}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      {integrations.isPending ? <IntegrationSkeleton /> : null}
      {integrations.isError ? (
        <AdminEmptyState
          description="The configuration summary could not be loaded. Refresh the page to try again."
          icon={ServerCogIcon}
          title="Providers unavailable"
        />
      ) : null}
      {integrations.data && visibleIntegrations.length === 0 ? (
        <AdminEmptyState
          description="No configured providers match the current search and filter."
          icon={SearchIcon}
          title="No integrations found"
        />
      ) : null}
      {visibleIntegrations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleIntegrations.map((integration) => {
            const details = integrationDetails[integration.id as keyof typeof integrationDetails];
            const Icon = details.icon;
            return (
              <Card key={integration.id}>
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <div className="space-y-2">
                    <Icon className="size-5 text-muted-foreground" />
                    <CardTitle className="text-base">{details.name}</CardTitle>
                  </div>
                  <AdminStatusBadge status={integration.status} />
                </CardHeader>
                <CardContent>
                  <CardDescription>{details.description}</CardDescription>
                  <p className="mt-3 font-medium text-muted-foreground text-xs capitalize">
                    {integration.category}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function IntegrationSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton className="h-40" key={index} />
      ))}
    </div>
  );
}
