import { useMutation } from "@tanstack/react-query";
import { formatCurrency } from "@repo/shared";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CoinsIcon, Loader2Icon, ReceiptTextIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AnimatedNumberText } from "@/components/ui/animated-number-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreditBalanceQuery,
  useCreditOrdersQuery,
  useCreditPackagesQuery,
} from "@/hooks/use-credits";
import { useTranslations } from "@/i18n";
import { orpc } from "@/utils/orpc";

const PENDING_CREDIT_ORDER_STORAGE_KEY = "credits.pendingOrderId";

export const Route = createFileRoute("/_authed/(dashboard)/credits/purchase")({
  component: RouteComponent,
});

function getCreditReturnUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function RouteComponent() {
  const t = useTranslations("dashboard.credits");
  const tRoot = useTranslations();
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const creditPackagesQuery = useCreditPackagesQuery();
  const creditBalanceQuery = useCreditBalanceQuery();
  const creditOrdersQuery = useCreditOrdersQuery(Boolean(pendingOrderId));
  const creditOrders = creditOrdersQuery.data?.data;

  const createCreditCheckout = useMutation({
    ...orpc.web.credits.createCheckoutSession.mutationOptions(),
    onSuccess: ({ url, orderId }) => {
      window.sessionStorage.setItem(PENDING_CREDIT_ORDER_STORAGE_KEY, orderId);
      setPendingOrderId(orderId);
      window.location.href = url;
    },
    onError: (error: Error) => {
      toast.error(`${t("checkoutError")}: ${error.message}`);
    },
  });

  useEffect(() => {
    setPendingOrderId(window.sessionStorage.getItem(PENDING_CREDIT_ORDER_STORAGE_KEY));
  }, []);

  useEffect(() => {
    if (!pendingOrderId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void creditBalanceQuery.refetch();
      void creditOrdersQuery.refetch();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [creditBalanceQuery.refetch, creditOrdersQuery.refetch, pendingOrderId]);

  useEffect(() => {
    if (!pendingOrderId || !creditOrdersQuery.data) {
      return;
    }

    const order = creditOrders?.find((item) => item.id === pendingOrderId);
    if (!order || order.status === "pending") {
      return;
    }

    window.sessionStorage.removeItem(PENDING_CREDIT_ORDER_STORAGE_KEY);
    setPendingOrderId(null);

    if (order.credited) {
      void creditBalanceQuery.refetch();
      toast.success(
        t("orderCreditedToast", {
          packageName: tRoot(`credits.packages.${order.packageId}.title`),
        }),
      );
    }
  }, [creditBalanceQuery.refetch, creditOrders, pendingOrderId, t, tRoot]);

  const handleCreditCheckout = (packageId: string) => {
    createCreditCheckout.mutate({
      packageId,
      returnUrl: getCreditReturnUrl(),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <CoinsIcon className="size-5" />
              {t("purchaseTitle")}
            </CardTitle>
            <CardDescription>{t("purchaseDescription")}</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/credits/transactions">
              <ReceiptTextIcon className="mr-2 size-4" />
              {t("viewTransactions")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">{t("balanceLabel")}</p>
              {creditBalanceQuery.isLoading ? (
                <Skeleton className="mt-3 h-10 w-24" />
              ) : (
                <AnimatedNumberText
                  value={creditBalanceQuery.data?.balance ?? 0}
                  className="mt-2 block text-4xl font-semibold"
                />
              )}
              {creditBalanceQuery.data?.expiringCredits ? (
                <p className="mt-3 text-sm text-amber-600">
                  {t("expiringNotice", {
                    count: creditBalanceQuery.data.expiringCredits,
                  })}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{t("balanceDescription")}</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {creditPackagesQuery.isLoading ? (
                <>
                  <Skeleton className="h-32 rounded-lg" />
                  <Skeleton className="h-32 rounded-lg" />
                </>
              ) : creditPackagesQuery.data?.length ? (
                creditPackagesQuery.data.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{tRoot(`credits.packages.${item.id}.title`)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {tRoot(`credits.packages.${item.id}.description`, {
                            count: item.amount,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.amountCents, item.currency)}
                      </p>
                      <Button
                        size="sm"
                        disabled={createCreditCheckout.isPending}
                        onClick={() => handleCreditCheckout(item.id)}
                      >
                        {createCreditCheckout.isPending ? (
                          <Loader2Icon className="mr-2 size-4 animate-spin" />
                        ) : null}
                        {t("buy")}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t("emptyPackages")}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
