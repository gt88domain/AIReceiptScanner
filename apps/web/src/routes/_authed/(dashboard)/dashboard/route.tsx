import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleUserRoundIcon, CoinsIcon, CreditCardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/i18n";

export const Route = createFileRoute("/_authed/(dashboard)/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  const t = useTranslations("dashboard.home");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title", { name: user.name ?? "" })}</h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CircleUserRoundIcon className="size-5" />
            <CardTitle>{t("profileTitle")}</CardTitle>
            <CardDescription>{t("profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings/profile">{t("profileAction")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CreditCardIcon className="size-5" />
            <CardTitle>{t("billingTitle")}</CardTitle>
            <CardDescription>{t("billingDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings/billing">{t("billingAction")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CoinsIcon className="size-5" />
            <CardTitle>{t("creditsTitle")}</CardTitle>
            <CardDescription>{t("creditsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/credits/purchase">{t("creditsAction")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
