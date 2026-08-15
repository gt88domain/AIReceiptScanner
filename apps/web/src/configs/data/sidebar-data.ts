import {
  ChartNoAxesCombined,
  ClipboardList,
  Coins,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  ServerCog,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  UserCog,
  Users,
} from "lucide-react";
import { resolveBackofficeVisibility } from "@repo/app-config/backoffice-visibility";
import type { SidebarData } from "@/components/dashboard/types";
import { webConfig } from "@/configs/web-config";

type BackofficeCapabilities = Pick<
  typeof webConfig,
  "billingEnabled" | "creditsEnabled" | "creditPurchasesEnabled" | "ticketsEnabled"
>;

export function createSidebarData({
  billingEnabled,
  creditsEnabled,
  creditPurchasesEnabled,
  ticketsEnabled,
}: BackofficeCapabilities): SidebarData {
  const visibility = resolveBackofficeVisibility({
    web: {
      billing: billingEnabled,
      credits: creditsEnabled,
      creditPurchases: creditPurchasesEnabled,
      tickets: ticketsEnabled,
    },
  });
  const creditUrl = creditPurchasesEnabled ? "/credits/purchase" : "/credits/transactions";

  return {
    user: {
      name: "satnaing",
      email: "satnaingdev@gmail.com",
      avatar: "/avatars/shadcn.jpg",
    },
    navGroups: [
      {
        title: "dashboard.nav.general",
        items: [
          {
            title: "dashboard.nav.dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
          },
        ],
      },
      {
        title: "dashboard.nav.other",
        items: [
          {
            title: "dashboard.nav.account",
            icon: Settings,
            defaultOpen: true,
            items: [
              {
                title: "dashboard.nav.profile",
                url: "/settings/profile",
                icon: UserCog,
              },
              ...(visibility.billing
                ? [
                    {
                      title: "dashboard.nav.billing",
                      url: "/settings/billing",
                      icon: ShieldCheck,
                    },
                  ]
                : []),
              ...(visibility.credits
                ? [
                    {
                      title: "dashboard.nav.credits",
                      url: creditUrl,
                      icon: Coins,
                    },
                  ]
                : []),
              {
                title: "dashboard.nav.security",
                url: "/settings/security",
                icon: Shield,
              },
            ],
          },
          ...(visibility.purchases
            ? [
                {
                  title: "dashboard.nav.purchases",
                  url: "/purchases",
                  icon: ShoppingBag,
                },
              ]
            : []),
          ...(visibility.tickets
            ? [
                {
                  title: "dashboard.nav.help",
                  icon: CircleHelp,
                  items: [
                    { title: "dashboard.nav.contact", url: "/help" },
                    { title: "dashboard.nav.tickets", url: "/tickets" },
                  ],
                },
              ]
            : [
                {
                  title: "dashboard.nav.help",
                  url: "/help",
                  icon: CircleHelp,
                },
              ]),
        ],
      },
    ],
  };
}

export const sidebarData = createSidebarData(webConfig);

export function createAdministrationNavGroup({
  billingEnabled,
  creditPurchasesEnabled,
  ticketsEnabled,
}: Pick<
  BackofficeCapabilities,
  "billingEnabled" | "creditPurchasesEnabled" | "ticketsEnabled"
>): SidebarData["navGroups"][number] {
  const visibility = resolveBackofficeVisibility({
    web: {
      billing: billingEnabled,
      credits: false,
      creditPurchases: creditPurchasesEnabled,
      tickets: ticketsEnabled,
    },
  });
  return {
    title: "dashboard.nav.administration",
    items: [
      {
        title: "dashboard.nav.overview",
        url: "/admin",
        icon: LayoutDashboard,
      },
      {
        title: "dashboard.nav.analytics",
        url: "/admin/analytics",
        icon: ChartNoAxesCombined,
      },
      {
        title: "dashboard.nav.users",
        url: "/admin/users",
        icon: Users,
      },
      ...(visibility.payments
        ? [
            {
              title: "dashboard.nav.payments",
              url: "/admin/payments",
              icon: CreditCard,
            },
          ]
        : []),
      ...(visibility.tickets
        ? [
            {
              title: "dashboard.nav.support",
              url: "/admin/support",
              icon: CircleHelp,
            },
          ]
        : []),
      {
        title: "dashboard.nav.audit",
        url: "/admin/audit",
        icon: ClipboardList,
      },
      {
        title: "dashboard.nav.system",
        url: "/admin/system",
        icon: ServerCog,
      },
    ],
  };
}

export const administrationNavGroup = createAdministrationNavGroup(webConfig);
