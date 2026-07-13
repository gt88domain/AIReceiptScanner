import {
  BadgePercentIcon,
  ChartNoAxesCombinedIcon,
  CirclePercentIcon,
  DollarSignIcon,
  ShoppingBagIcon,
  TrendingUpIcon,
} from "lucide-react";

import { Bar, BarChart, Label, Pie, PieChart } from "recharts";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useTranslations } from "@/i18n";

const salesPlanPercentage = 54;
const totalBars = 24;
const filledBars = Math.round((salesPlanPercentage * totalBars) / 100);

// Sales chart data
const salesChartData = Array.from({ length: totalBars }, (_, index) => {
  const date = new Date(2025, 5, 15);

  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return {
    date: formattedDate,
    sales: index < filledBars ? 315 : 0,
  };
});

const salesChartConfig = {
  sales: {
    label: "Sales",
  },
} satisfies ChartConfig;

// Function to get metrics data with translations
function useMetricsData() {
  const t = useTranslations("dashboard.salesMetrics");

  return [
    {
      icons: <TrendingUpIcon className="size-5" />,
      title: t("salesTrend"),
      value: "$11,548",
    },
    {
      icons: <BadgePercentIcon className="size-5" />,
      title: t("discountOffers"),
      value: "$1,326",
    },
    {
      icons: <DollarSignIcon className="size-5" />,
      title: t("netProfit"),
      value: "$17,356",
    },
    {
      icons: <ShoppingBagIcon className="size-5" />,
      title: t("totalOrders"),
      value: "248",
    },
  ];
}

// Function to get revenue chart data with translations
function useRevenueChartData() {
  const t = useTranslations("dashboard.salesMetrics");

  return [
    {
      month: "january",
      sales: 340,
      fill: "var(--color-january)",
      label: t("months.january"),
    },
    {
      month: "february",
      sales: 200,
      fill: "var(--color-february)",
      label: t("months.february"),
    },
    {
      month: "march",
      sales: 200,
      fill: "var(--color-march)",
      label: t("months.march"),
    },
  ];
}

function useRevenueChartConfig() {
  const t = useTranslations("dashboard.salesMetrics");

  return {
    sales: {
      label: "Sales",
    },
    january: {
      label: t("months.january"),
      color: "var(--primary)",
    },
    february: {
      label: t("months.february"),
      color: "color-mix(in oklab, var(--primary) 60%, transparent)",
    },
    march: {
      label: t("months.march"),
      color: "color-mix(in oklab, var(--primary) 20%, transparent)",
    },
  } satisfies ChartConfig;
}

export const SalesMetricsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("dashboard.salesMetrics");
  const metricsData = useMetricsData();
  const revenueChartData = useRevenueChartData();
  const revenueChartConfig = useRevenueChartConfig();

  return (
    <Card className={className}>
      <CardContent className="space-y-4">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="flex flex-col gap-7 lg:col-span-3">
            <span className="text-lg font-semibold">{t("title")}</span>
            <div className="flex items-center gap-3">
              <img
                src="https://cdn.shadcnstudio.com/ss-assets/logo/logo-square.png"
                className="size-10.5 rounded-lg"
                alt="logo"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-xl font-medium">{t("companyName")}</span>
                <span className="text-muted-foreground text-sm">{t("companyEmail")}</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {metricsData.map((metric, index) => (
                <div key={index} className="flex items-center gap-3 rounded-md border px-4 py-2">
                  <Avatar className="size-8.5 rounded-sm">
                    <AvatarFallback className="bg-primary/10 text-primary shrink-0 rounded-sm">
                      {metric.icons}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-sm font-medium">
                      {metric.title}
                    </span>
                    <span className="text-lg font-medium">{metric.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Card className="gap-4 py-4 shadow-none lg:col-span-2">
            <CardHeader className="gap-1">
              <CardTitle className="text-lg font-semibold">{t("revenueGoal")}</CardTitle>
            </CardHeader>

            <CardContent className="px-0">
              <ChartContainer config={revenueChartConfig} className="h-38.5 w-full">
                <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={revenueChartData}
                    dataKey="sales"
                    nameKey="month"
                    startAngle={300}
                    endAngle={660}
                    innerRadius={58}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) - 12}
                                className="fill-card-foreground text-lg font-medium"
                              >
                                256.24
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 19}
                                className="fill-muted-foreground text-sm"
                              >
                                {t("totalProfit")}
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>

            <CardFooter className="justify-between">
              <span className="text-xl">{t("planCompleted")}</span>
              <span className="text-2xl font-medium">56%</span>
            </CardFooter>
          </Card>
        </div>
        <Card className="shadow-none">
          <CardContent className="grid gap-4 px-4 lg:grid-cols-5">
            <div className="flex flex-col justify-center gap-6">
              <span className="text-lg font-semibold">{t("salesPlan")}</span>
              <span className="max-lg:5xl text-6xl">{salesPlanPercentage}%</span>
              <span className="text-muted-foreground text-sm">{t("percentageProfit")}</span>
            </div>
            <div className="flex flex-col gap-6 text-lg md:col-span-4">
              <span className="font-medium">{t("cohortAnalysis")}</span>
              <span className="text-muted-foreground text-wrap">{t("cohortDescription")}</span>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <ChartNoAxesCombinedIcon className="size-6" />
                  <span className="text-lg font-medium">{t("openStatistics")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CirclePercentIcon className="size-6" />
                  <span className="text-lg font-medium">{t("percentageChange")}</span>
                </div>
              </div>

              <ChartContainer config={salesChartConfig} className="h-7.75 w-full">
                <BarChart
                  accessibilityLayer
                  data={salesChartData}
                  margin={{
                    left: 0,
                    right: 0,
                  }}
                  maxBarSize={16}
                >
                  <Bar
                    dataKey="sales"
                    fill="var(--primary)"
                    background={{
                      fill: "color-mix(in oklab, var(--primary) 10%, transparent)",
                      radius: 12,
                    }}
                    radius={12}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};
