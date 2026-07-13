import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircleIcon, Loader2Icon } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/i18n";
import { orpc } from "@/utils/orpc";

const searchSchema = z.object({
  planId: z.string().optional(),
  priceId: z.string().optional(),
});

export const Route = createFileRoute("/billing/success")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const t = useTranslations("billingSuccess");
  const navigate = useNavigate();
  const search = Route.useSearch();

  const statusQuery = useQuery(
    orpc.payments.getBillingStatus.queryOptions({
      staleTime: 0,
      refetchOnWindowFocus: true,
    }),
  );
  const hasExpectedCheckoutTarget = Boolean(search.planId && search.priceId);
  const isCheckoutSynced = hasExpectedCheckoutTarget
    ? statusQuery.data?.activePlan?.id === search.planId &&
      statusQuery.data?.activePrice?.id === search.priceId
    : Boolean(statusQuery.data?.activePlan);

  useEffect(() => {
    if (isCheckoutSynced) {
      navigate({ to: "/settings/billing", replace: true });
    }
  }, [isCheckoutSynced, navigate]);

  useEffect(() => {
    if (statusQuery.isError || isCheckoutSynced) {
      return;
    }

    const interval = setInterval(() => {
      statusQuery.refetch();
    }, 3000);

    return () => clearInterval(interval);
  }, [isCheckoutSynced, statusQuery.isError, statusQuery.refetch]);

  const isSyncing = !statusQuery.isError && !isCheckoutSynced;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircleIcon className="size-5 text-green-600" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("description")}</p>
          {isSyncing ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                <span>{t("syncingTitle")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("syncingDescription")}</p>
            </div>
          ) : null}
          <Button asChild>
            <Link to="/settings/billing">{t("goToBilling")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
