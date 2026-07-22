import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircleIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBillingStatusQuery } from "@/hooks/use-payments";
import { useTranslations } from "@/i18n";

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
  const [isPolling, setIsPolling] = useState(true);

  const statusQuery = useBillingStatusQuery();
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
    if (statusQuery.isError || isCheckoutSynced || !isPolling) {
      return;
    }

    const interval = setInterval(() => {
      void statusQuery.refetch();
    }, 3000);
    const timeout = setTimeout(() => setIsPolling(false), 60_000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isCheckoutSynced, isPolling, statusQuery.isError, statusQuery.refetch]);

  const isSyncing = !statusQuery.isError && !isCheckoutSynced && isPolling;
  const handleRefresh = () => {
    setIsPolling(true);
    void statusQuery.refetch();
  };

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
          {statusQuery.isError || (!isPolling && !isCheckoutSynced) ? (
            <Alert>
              <AlertDescription>{t("manualRefreshDescription")}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/settings/billing">{t("goToBilling")}</Link>
            </Button>
            {!isCheckoutSynced ? (
              <Button variant="outline" onClick={handleRefresh} disabled={statusQuery.isFetching}>
                {statusQuery.isFetching ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCwIcon className="mr-2 size-4" />
                )}
                {t("refreshStatus")}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
