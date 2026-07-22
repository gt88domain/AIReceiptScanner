import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/auth-client";
import { useOrpc } from "./use-orpc";

/** Loads web-available credit packages. */
export function useCreditPackagesQuery() {
  const orpc = useOrpc();
  return useQuery({
    queryKey: ["credits", "packages", "web"],
    queryFn: () => orpc.credits.listPackages.call({ platform: "web" }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Loads the current authenticated account credit balance. */
export function useCreditBalanceQuery() {
  const orpc = useOrpc();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["credits", "balance", userId],
    queryFn: () => orpc.credits.getBalance.call({}),
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Loads recent web credit package purchase orders. */
export function useCreditOrdersQuery(enabled = true) {
  const orpc = useOrpc();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["credits", "orders", "web", userId],
    queryFn: () => orpc.credits.listOrders.call({ page: 1, perPage: 10 }),
    enabled: enabled && Boolean(userId),
    staleTime: 10_000,
    refetchOnWindowFocus: enabled,
  });
}

/** Loads recent credit ledger transactions. */
export function useCreditTransactionsQuery(
  page = 1,
  perPage = 10,
  sourceType?: "purchase" | "usage",
) {
  const orpc = useOrpc();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["credits", "transactions", userId, page, perPage, sourceType ?? null],
    queryFn: () => orpc.credits.listTransactions.call({ page, perPage, sourceType }),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
