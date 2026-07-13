import { createFileRoute } from "@tanstack/react-router";
import { ChartAreaInteractive } from "@/components/dashboard/chart-area-interactive";
import { SalesMetricsCard } from "@/components/dashboard/chart-sales-metrics";
import { EarningData, useStatisticsCardData } from "@/components/dashboard/data/dashboard";
import { StatisticsCard } from "@/components/dashboard/statistics-card-02";
import { UsersTable } from "@/components/dashboard/users-table";
import { ProductInsightsCard } from "@/components/dashboard/widget-product-insights";
import { TotalEarningCard } from "@/components/dashboard/widget-total-earning";
import { Card } from "@/components/ui/card";
import { useTranslations } from "@/i18n";

export const Route = createFileRoute("/_authed/(dashboard)/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const tUsersTable = useTranslations("dashboard.usersTable");
  const tCards = useTranslations("dashboard.cards");
  const statisticsCardData = useStatisticsCardData();

  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
      {/* Statistics Cards */}
      <div className="col-span-full grid gap-6 sm:grid-cols-3 md:max-lg:grid-cols-1">
        {statisticsCardData.map((card, index) => (
          <StatisticsCard
            key={index}
            icon={card.icon}
            title={card.title}
            value={card.value}
            changePercentage={card.changePercentage}
          />
        ))}
      </div>

      <div className="grid gap-6 max-xl:col-span-full lg:max-xl:grid-cols-2">
        {/* Product Insights Card */}
        <ProductInsightsCard className="justify-between gap-3 *:data-[slot=card-content]:space-y-5" />

        {/* Total Earning Card */}
        <TotalEarningCard
          title={tCards("totalEarning")}
          earning={24650}
          trend="up"
          percentage={10}
          comparisonText={tCards("comparisonText")}
          earningData={EarningData}
          className="justify-between gap-5 sm:min-w-0 *:data-[slot=card-content]:space-y-7"
        />
      </div>

      <SalesMetricsCard className="col-span-full xl:col-span-2 *:data-[slot=card-content]:space-y-6" />

      <Card className="col-span-full w-full py-0">
        <ChartAreaInteractive />
      </Card>

      {/* Users Table Example */}
      <Card className="col-span-full">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{tUsersTable("title")}</h3>
            <p className="text-sm text-muted-foreground">{tUsersTable("description")}</p>
          </div>
          <UsersTable />
        </div>
      </Card>
    </div>
  );
}
