import { Link } from "@tanstack/react-router";
import { CoinsIcon, ReceiptTextIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedNumberText } from "@/components/ui/animated-number-text";
import { Skeleton } from "@/components/ui/skeleton";
import { webConfig } from "@/configs/web-config";
import { useCreditBalanceQuery } from "@/hooks/use-credits";
import { useTranslations } from "@/i18n";

const creditsEnabled = webConfig.creditsEnabled;

function CreditBalanceValue() {
  const t = useTranslations("dashboard.credits");
  const navT = useTranslations("dashboard.nav");
  const creditBalanceQuery = useCreditBalanceQuery();
  const balance = creditBalanceQuery.data?.balance ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-md border bg-muted/20 px-2.5 text-sm font-medium outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] data-[state=open]:bg-muted/40"
          type="button"
          aria-label={`${t("balanceLabel")}: ${balance}`}
          aria-busy={creditBalanceQuery.isLoading}
          title={`${t("balanceLabel")}: ${balance}`}
        >
          <CoinsIcon className="size-4 text-muted-foreground" />
          {creditBalanceQuery.isLoading ? (
            <Skeleton className="h-4 w-7" />
          ) : (
            <AnimatedNumberText value={balance} className="min-w-5 text-right" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem asChild>
          <Link to="/credits/purchase">
            <CoinsIcon />
            {navT("creditPurchase")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/credits/transactions">
            <ReceiptTextIcon />
            {navT("creditTransactions")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CreditBalanceIndicator() {
  if (!creditsEnabled) {
    return null;
  }

  return <CreditBalanceValue />;
}
