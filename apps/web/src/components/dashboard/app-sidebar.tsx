import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/logos/brand-logo";
import { useLayout } from "@/components/providers/layout-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { CurrentUser } from "@/lib/auth/auth-server";
import { useOrpc } from "@/hooks/use-orpc";
import { webConfig } from "@/configs/web-config";
import { sidebarData } from "../../configs/data/sidebar-data";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";

export function AppSidebar({ user }: { user: CurrentUser }) {
  const { collapsible, variant } = useLayout();
  const orpc = useOrpc();
  const adminAccess = useQuery({
    ...orpc.admin.getAccess.queryOptions(),
    queryKey: ["admin", "access", user.id],
    enabled: webConfig.adminEnabled,
  });
  const navGroups = adminAccess.data?.isAdmin
    ? [
        ...sidebarData.navGroups,
        {
          title: "dashboard.nav.admin",
          items: [{ title: "dashboard.nav.admin", url: "/admin", icon: ShieldCheck }],
        },
      ]
    : sidebarData.navGroups;
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <Link
          className="flex h-10 min-w-0 items-center rounded-md px-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          to="/"
        >
          <BrandLogo
            className="min-w-0 group-data-[collapsible=icon]:gap-0"
            size={28}
            titleClassName="truncate text-base group-data-[collapsible=icon]:hidden"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
