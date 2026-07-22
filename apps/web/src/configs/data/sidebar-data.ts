import { Coins, LayoutDashboard, Settings, Shield, ShieldCheck, UserCog } from "lucide-react";
import type { SidebarData } from "@/components/dashboard/types";
import { webConfig } from "@/configs/web-config";

const creditsEnabled = webConfig.creditsEnabled;

export const sidebarData: SidebarData = {
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
          title: "dashboard.nav.settings",
          icon: Settings,
          defaultOpen: true,
          items: [
            {
              title: "dashboard.nav.profile",
              url: "/settings/profile",
              icon: UserCog,
            },
            {
              title: "dashboard.nav.billing",
              url: "/settings/billing",
              icon: ShieldCheck,
            },
            ...(creditsEnabled
              ? [
                  {
                    title: "dashboard.nav.credits",
                    url: "/credits/purchase",
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
      ],
    },
  ],
};
