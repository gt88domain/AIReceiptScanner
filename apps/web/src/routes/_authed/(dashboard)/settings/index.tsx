import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleUserRoundIcon, CoinsIcon, CreditCardIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/i18n";
import { webConfig } from "@/configs/web-config";

export const Route = createFileRoute("/_authed/(dashboard)/settings/")({
  component: RouteComponent,
});

function RouteComponent() {
  const t = useTranslations("dashboard.settings.home");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SettingsCard
          action={t("profileAction")}
          description={t("profileDescription")}
          icon={CircleUserRoundIcon}
          title={t("profileTitle")}
          to="/settings/profile"
        />
        {webConfig.billingEnabled ? (
          <SettingsCard
            action={t("billingAction")}
            description={t("billingDescription")}
            icon={CreditCardIcon}
            title={t("billingTitle")}
            to="/settings/billing"
          />
        ) : null}
        {webConfig.creditsEnabled ? (
          <SettingsCard
            action={t("creditsAction")}
            description={t("creditsDescription")}
            icon={CoinsIcon}
            title={t("creditsTitle")}
            to={webConfig.creditPurchasesEnabled ? "/credits/purchase" : "/credits/transactions"}
          />
        ) : null}
        <SettingsCard
          action={t("securityAction")}
          description={t("securityDescription")}
          icon={ShieldCheckIcon}
          title={t("securityTitle")}
          to="/settings/security"
        />
      </div>
    </div>
  );
}

function SettingsCard({
  action,
  description,
  icon: Icon,
  title,
  to,
}: {
  action: string;
  description: string;
  icon: typeof CircleUserRoundIcon;
  title: string;
  to:
    | "/settings/profile"
    | "/settings/billing"
    | "/credits/purchase"
    | "/credits/transactions"
    | "/settings/security";
}) {
  return (
    <Card>
      <CardHeader>
        <Icon className="size-5" />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link to={to}>{action}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
