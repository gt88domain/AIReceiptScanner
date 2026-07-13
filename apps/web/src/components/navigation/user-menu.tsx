import { Link } from "@tanstack/react-router";
import { useTranslations } from "@/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import useDialogState from "@/hooks/use-dialog-state";
import { authClient } from "@/lib/auth/auth-client";
import { SignOutDialog } from "../auth/sign-out-dialog";

type UserMenuProps = {
  onActionComplete?: () => void;
};

export default function UserMenu({ onActionComplete }: UserMenuProps = {}) {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [open, setOpen] = useDialogState();
  const t = useTranslations("common");

  const completeAction = () => {
    if (!onActionComplete) return;
    window.requestAnimationFrame(() => {
      onActionComplete();
    });
  };

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <Button asChild variant="outline">
        <Link to="/auth/sign-in" onClick={completeAction}>
          {t("signIn")}
        </Link>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage alt={user?.name ?? ""} src={user?.image ?? ""} />
            <AvatarFallback className="rounded-lg">
              {user?.name?.slice(0, 2).toUpperCase() || "CN"}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* dashboard */}
          <DropdownMenuItem asChild>
            <Link to="/dashboard" onClick={completeAction}>
              <div className="flex items-center space-x-2.5">
                <p className="text-sm">{t("dashboard")}</p>
              </div>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setOpen(true);
              completeAction();
            }}
          >
            <div className="flex items-center space-x-2.5">
              <p className="text-sm">{t("signOut")}</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SignOutDialog onOpenChange={setOpen} open={!!open} />
    </>
  );
}
