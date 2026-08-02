import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import Purchases from "react-native-purchases";
import { appConfig } from "@/configs/app-config";
import { nativePayments, resolveNativePaymentsPlatform } from "@/lib/payments/revenuecat";
import { orpc } from "@/lib/orpc";
import { useAuth } from "@/providers/auth-provider";

/** Maximum time the client waits for webhook-driven balance synchronization. */
const CREDIT_SYNC_WINDOW_MS = 30_000;
/** Poll interval used while waiting for server-side credit grant confirmation. */
const CREDIT_SYNC_POLL_INTERVAL_MS = 3_000;
const CREDIT_PAGE_SIZE = 10;

/** Result returned by a native credit package purchase attempt. */
export type NativeCreditPurchaseResult =
  | {
      status: "purchased";
      synced: boolean;
    }
  | {
      status: "cancelled";
      synced: false;
    };

/** Sleeps for the requested number of milliseconds. */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Detects store purchase cancellation across RevenueCat error shapes. */
function isPurchaseCancelledError(cause: unknown) {
  if (!cause || typeof cause !== "object") {
    return false;
  }

  const normalized = cause as {
    code?: unknown;
    userCancelled?: unknown;
    message?: unknown;
  };

  if (normalized.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
    return true;
  }

  if (normalized.userCancelled === true) {
    return true;
  }

  return (
    typeof normalized.message === "string" &&
    normalized.message.toLowerCase().includes("purchase was cancelled")
  );
}

/** Loads account credits and purchases native credit packages through RevenueCat. */
export function useCredits() {
  const nativePlatform = resolveNativePaymentsPlatform();
  const { isAuthenticated, isPaymentsReady, isPending: isAuthPending, user } = useAuth();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const packagesQuery = useQuery({
    queryKey: ["credits", "packages", nativePlatform],
    queryFn: () => {
      if (!nativePlatform) {
        throw new Error("Native credit packages are not supported on this platform");
      }

      return orpc.credits.listPackages.call({ platform: nativePlatform });
    },
    enabled: appConfig.creditsEnabled && nativePlatform !== null,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const balanceQuery = useQuery({
    queryKey: ["credits", "balance", user?.id ?? null],
    queryFn: () => orpc.credits.getBalance.call({}),
    enabled: appConfig.creditsEnabled && !isAuthPending && isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const isAvailable =
    appConfig.creditsEnabled &&
    nativePlatform !== null &&
    nativePayments.getConfig().isAvailable &&
    isPaymentsReady;

  const refetchCredits = useCallback(async () => {
    await balanceQuery.refetch();
  }, [balanceQuery]);

  /** Polls until the webhook-updated server balance increases or the sync window ends. */
  const waitForBalanceSync = useCallback(
    async (previousBalance: number | null) => {
      const startedAt = Date.now();

      // Native purchases are granted by the RevenueCat webhook, so the client waits for server state.
      while (Date.now() - startedAt < CREDIT_SYNC_WINDOW_MS) {
        const result = await balanceQuery.refetch();
        const nextBalance = result.data?.balance ?? null;
        if (previousBalance === null || (nextBalance !== null && nextBalance > previousBalance)) {
          return true;
        }

        await sleep(CREDIT_SYNC_POLL_INTERVAL_MS);
      }

      return false;
    },
    [balanceQuery],
  );

  /** Purchases a native credit package and waits briefly for server ledger synchronization. */
  const purchase = useCallback(
    async (packageId: string): Promise<NativeCreditPurchaseResult> => {
      setIsPurchasing(true);
      setError(null);
      const previousBalance = balanceQuery.data?.balance ?? null;

      try {
        // The local SDK success only confirms store purchase completion; it never mutates balance.
        await nativePayments.purchaseCreditPackage({ packageId });
        if (!mountedRef.current) {
          return { status: "purchased", synced: false };
        }

        setIsPurchasing(false);
        setIsSyncing(true);
        const synced = await waitForBalanceSync(previousBalance);
        if (mountedRef.current) {
          setIsSyncing(false);
        }

        return { status: "purchased", synced };
      } catch (cause) {
        const cancelled = isPurchaseCancelledError(cause);
        const nextError = nativePayments.toError(cause);

        if (mountedRef.current) {
          setIsPurchasing(false);
          setIsSyncing(false);
          setError(cancelled ? null : nextError);
        }

        if (cancelled) {
          return { status: "cancelled", synced: false };
        }

        console.warn("[credits] Failed to purchase credit package", {
          packageId,
          error: nextError,
        });
        throw nextError;
      }
    },
    [balanceQuery.data?.balance, waitForBalanceSync],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    balance: balanceQuery.data ?? null,
    packages: packagesQuery.data ?? [],
    isAvailable,
    isLoading: balanceQuery.isLoading || packagesQuery.isLoading,
    isPackagesLoading: packagesQuery.isLoading,
    isPurchasing,
    isSyncing,
    error,
    purchase,
    refetchCredits,
  };
}

/** Loads account credit ledger transactions with paginated fetching. */
export function useCreditTransactions(sourceType?: "purchase" | "usage") {
  const { isAuthenticated, isPending: isAuthPending, user } = useAuth();
  const transactionsQuery = useInfiniteQuery({
    queryKey: ["credits", "transactions", user?.id ?? null, sourceType ?? null],
    queryFn: ({ pageParam }) =>
      orpc.credits.listTransactions.call({
        page: pageParam,
        perPage: CREDIT_PAGE_SIZE,
        sourceType,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      pages.length < lastPage.pageCount ? pages.length + 1 : undefined,
    enabled: appConfig.creditsEnabled && !isAuthPending && isAuthenticated,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  return {
    transactions: transactionsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    isLoading: transactionsQuery.isLoading,
    fetchNextPage: transactionsQuery.fetchNextPage,
    hasNextPage: transactionsQuery.hasNextPage,
    isFetchingNextPage: transactionsQuery.isFetchingNextPage,
  };
}
