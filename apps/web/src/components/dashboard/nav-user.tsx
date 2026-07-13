import { IconDotsVertical } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Home, LogOut, Sparkles } from "lucide-react";
import { SignOutDialog } from "@/components/auth/sign-out-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import useDialogState from "@/hooks/use-dialog-state";
import { useCurrentSubscription } from "@/hooks/use-payments";
import { useTranslations } from "@/i18n";
import type { CurrentUser } from "@/lib/auth/auth-server";
import { UserInfo } from "../shared/user-info";

export function NavUser({ user }: { user: CurrentUser }) {
  const t = useTranslations("dashboard.nav");
  const { isMobile } = useSidebar();
  const [open, setOpen] = useDialogState();
  const { hasLifetime, hasSubscription } = useCurrentSubscription({
    includePlan: false,
  });

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                size="lg"
              >
                <UserInfo user={user} />
                <IconDotsVertical className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserInfo user={user} />
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to="/">
                    <Home />
                    {t("home")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {hasSubscription || hasLifetime ? null : (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link to="/settings/billing">
                        <Sparkles />
                        {t("upgradeToPro")}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to="/settings/profile">
                    <BadgeCheck />
                    {t("profile")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOpen(true)} variant="destructive">
                <LogOut />
                {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog onOpenChange={setOpen} open={!!open} />
    </>
  );
}
