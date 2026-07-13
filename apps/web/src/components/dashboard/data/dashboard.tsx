import { CalendarX2Icon, TriangleAlertIcon, TruckIcon } from "lucide-react";
import { useTranslations } from "@/i18n";

// Function to get statistics card data with translations
export function useStatisticsCardData() {
  const t = useTranslations("dashboard.statistics");

  return [
    {
      icon: <TruckIcon className="size-4" />,
      value: "42",
      title: t("shippedOrders"),
      changePercentage: "+18.2%",
    },
    {
      icon: <TriangleAlertIcon className="size-4" />,
      value: "8",
      title: t("damagedReturns"),
      changePercentage: "-8.7%",
    },
    {
      icon: <CalendarX2Icon className="size-4" />,
      value: "27",
      title: t("missedDeliverySlots"),
      changePercentage: "+4.3%",
    },
  ];
}

// Keep the original export for backward compatibility
export const StatisticsCardData = [
  {
    icon: <TruckIcon className="size-4" />,
    value: "42",
    title: "Shipped Orders",
    changePercentage: "+18.2%",
  },
  {
    icon: <TriangleAlertIcon className="size-4" />,
    value: "8",
    title: "Damaged Returns",
    changePercentage: "-8.7%",
  },
  {
    icon: <CalendarX2Icon className="size-4" />,
    value: "27",
    title: "Missed Delivery Slots",
    changePercentage: "+4.3%",
  },
];

// Earning data for Total Earning card
export const EarningData = [
  {
    img: "https://cdn.shadcnstudio.com/ss-assets/blocks/dashboard-application/widgets/zipcar.png",
    platform: "Zipcar",
    technologies: "Vuejs & HTML",
    earnings: "-$23,569.26",
    progressPercentage: 75,
  },
  {
    img: "https://cdn.shadcnstudio.com/ss-assets/blocks/dashboard-application/widgets/bitbank.png",
    platform: "Bitbank",
    technologies: "Figma & React",
    earnings: "-$12,650.31",
    progressPercentage: 25,
  },
];
