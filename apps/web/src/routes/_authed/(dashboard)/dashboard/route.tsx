import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleUserRoundIcon, CoinsIcon, CreditCardIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreditBalanceQuery } from "@/hooks/use-credits";
import { useTranslations } from "@/i18n";
import { useBillingStatusQuery } from "@/hooks/use-payments";

export const Route = createFileRoute("/_authed/(dashboard)/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  const t = useTranslations("dashboard.home");
  const tBilling = useTranslations("dashboard.billing");
  const billingQuery = useBillingStatusQuery();
  const creditBalanceQuery = useCreditBalanceQuery();
  const billingTier = billingQuery.data?.currentEntitlement.tier ?? "free";
  const billingSummary =
    billingTier === "free"
      ? tBilling("free")
      : tBilling(`membershipTypes.${billingTier}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title", { name: user.name ?? "" })}</h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CircleUserRoundIcon className="size-5" />
            <CardTitle>{t("profileTitle")}</CardTitle>
            <CardDescription>{user.email ?? t("profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings/profile">{t("profileAction")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CreditCardIcon className="size-5" />
            <CardTitle>{t("billingTitle")}</CardTitle>
            <CardDescription>
              {billingQuery.isLoading ? <Skeleton className="h-4 w-24" /> : billingSummary}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings/billing">{t("billingAction")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CoinsIcon className="size-5" />
            <CardTitle>{t("creditsTitle")}</CardTitle>
            <CardDescription>
              {creditBalanceQuery.isLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                t("creditsBalance", { count: creditBalanceQuery.data?.balance ?? 0 })
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/credits/purchase">{t("creditsAction")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <ShieldCheckIcon className="size-5" />
            <CardTitle>{t("securityTitle")}</CardTitle>
            <CardDescription>
              {user.emailVerified ? t("securityVerified") : t("securityUnverified")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings/security">{t("securityAction")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
