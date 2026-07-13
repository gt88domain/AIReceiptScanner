import { Bar, BarChart } from "recharts";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "@/i18n";

import { cn } from "@/lib/utils";

// Product reached data
const productReachChartData = [
  { month: "January", reached: 168 },
  { month: "February", reached: 305 },
  { month: "March", reached: 213 },
  { month: "April", reached: 330 },
  { month: "May", reached: 305 },
];

const productReachChartConfig = {
  reached: {
    label: "Reached",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

// Order placed data
const orderPlacedChartData = [
  { month: "January", orders: 168 },
  { month: "February", orders: 305 },
  { month: "March", orders: 213 },
  { month: "April", orders: 330 },
  { month: "May", orders: 305 },
];

const orderPlacedChartConfig = {
  orders: {
    label: "Orders",
    color: "color-mix(in oklab, var(--primary) 10%, transparent)",
  },
} satisfies ChartConfig;

// https://shadcnstudio.com/blocks/dashboard-and-application/dashboard-shell
export const ProductInsightsCard = ({ className }: { className?: string }) => {
  const t = useTranslations("dashboard.productInsights");

  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader className="flex justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold">{t("title")}</span>
          <span className="text-muted-foreground text-sm">{t("publishedOn")}</span>
        </div>
        <img
          src="https://cdn.shadcnstudio.com/ss-assets/blocks/dashboard-application/widgets/image-7.png"
          alt={t("productAlt")}
          className="w-20.5 rounded-md"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <Separator />
        <div className="flex items-center justify-between gap-1">
          <div className="flex flex-col gap-1">
            <span className="text-xs">{t("productReached")}</span>
            <span className="text-2xl font-semibold">21,153</span>
          </div>
          <ChartContainer config={productReachChartConfig} className="min-h-13 max-w-18">
            <BarChart accessibilityLayer data={productReachChartData} barSize={8}>
              <Bar dataKey="reached" fill="var(--color-reached)" radius={2} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="flex items-center justify-between gap-1">
          <div className="flex flex-col gap-1">
            <span className="text-xs">{t("orderPlaced")}</span>
            <span className="text-2xl font-semibold">2,123</span>
          </div>
          <ChartContainer config={orderPlacedChartConfig} className="min-h-13 max-w-18">
            <BarChart accessibilityLayer data={orderPlacedChartData} barSize={8}>
              <Bar dataKey="orders" fill="var(--color-orders)" radius={2} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};
