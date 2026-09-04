import { compareMembershipTiers, type CurrentEntitlement } from "@repo/app-config/membership";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import Purchases, { type CustomerInfo, type PurchasesOfferings } from "react-native-purchases";
import {
  EMPTY_NATIVE_ENTITLEMENT_STATE,
  resolveNativeEntitlementState,
} from "@/lib/payments/entitlement";
import { useAuth } from "@/providers/auth-provider";
import { nativePayments } from "@/lib/payments/revenuecat";
import type { NativeEntitlementState } from "@/lib/payments/types";
import { orpc } from "@/lib/orpc";

const LOCAL_ENTITLEMENT_SYNC_WINDOW_MS = 30_000;
const BILLING_STATUS_SYNC_POLL_INTERVAL_MS = 3_000;

/** Internal state for the native payments hook, combining RevenueCat SDK data, UI flags, and entitlement info. */
type NativePaymentsState = {
  /** Customer info from RevenueCat containing subscription and purchase records */
  customerInfo: CustomerInfo | null;
  /** Available product offerings for display */
  offerings: PurchasesOfferings | null;
  /** Whether the initial RevenueCat snapshot is loading */
  isLoading: boolean;
  /** Whether a purchase or restore operation is in progress */
  isPurchasing: boolean;
  /** Most recent operation error (user cancellation is not treated as an error) */
  error: Error | null;
  /** Price IDs of currently active plans derived from RevenueCat entitlements */
  activePlanPriceIds: ReturnType<typeof nativePayments.getActivePlanPriceIds>;
} & NativeEntitlementState;

/** Normalized shape of the server-side billing status used for entitlement reconciliation. */
type ServerBillingStatusLike = {
  /** Payment provider: Stripe (web), RevenueCat (native), or null if none */
  billingProvider: "stripe" | "revenuecat" | null;
  /** Whether the user can access a billing management portal */
  canManageBilling: boolean;
  /** Current entitlement tier and source as determined by the server */
  currentEntitlement: {
    tier: CurrentEntitlement["tier"];
    source: CurrentEntitlement["source"];
  };
  /** Currently active plan, if any */
  activePlan: {
    id: string;
  } | null;
  /** Pricing details of the active plan */
  activePrice: {
    id: string;
    currency: string;
    amountCents: number;
    priceType: "subscription" | "lifetime";
    interval: "month" | "year" | null;
  } | null;
  /** Whether the user has a recurring subscription */
  hasActiveSubscription: boolean;
  /** One-time lifetime purchase record, if any */
  lifetimePurchase: {
    id: string;
  } | null;
};

export type NativePurchaseResult =
  | {
      status: "purchased";
      customerInfo: CustomerInfo | null;
    }
  | {
      status: "cancelled";
      customerInfo: null;
    };

/** Detects user-initiated purchase cancellation across the different error shapes RevenueCat may emit. */
function isPurchaseCancelledError(cause: unknown) {
  if (!cause || typeof cause !== "object") {
    return false;
  }

  // RevenueCat does not always use the same cancellation payload across platforms
  // and SDK versions, so cancellation is normalized here into a single branch.
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

function resolveServerEntitlementState(
  billingStatus: ServerBillingStatusLike | null | undefined,
): NativeEntitlementState | null {
  if (!billingStatus) {
    return null;
  }

  return {
    currentEntitlement: {
      tier: billingStatus.currentEntitlement.tier,
      source: billingStatus.currentEntitlement.source,
      planId: billingStatus.activePlan?.id ?? null,
      priceId: billingStatus.activePrice?.id ?? null,
    },
    activePlan: billingStatus.activePlan,
    activePrice: billingStatus.activePrice,
    hasLifetime: billingStatus.lifetimePurchase !== null,
    hasActiveSubscription: billingStatus.hasActiveSubscription,
  };
}

function isSameEntitlement(a: CurrentEntitlement, b: CurrentEntitlement | null) {
  if (!b) {
    return false;
  }

  return (
    a.tier === b.tier && a.source === b.source && a.planId === b.planId && a.priceId === b.priceId
  );
}

function shouldPreferLocalEntitlement(
  localEntitlement: CurrentEntitlement,
  serverEntitlement: CurrentEntitlement | null,
) {
  if (localEntitlement.source === "none") {
    return false;
  }

  if (!serverEntitlement) {
    return true;
  }

  return compareMembershipTiers(localEntitlement.tier, serverEntitlement.tier) > 0;
}

function shouldUseLocalEntitlement(
  localEntitlement: CurrentEntitlement,
  serverEntitlement: CurrentEntitlement | null,
  canPreferLocalEntitlement: boolean,
) {
  if (!canPreferLocalEntitlement) {
    return false;
  }

  if (!shouldPreferLocalEntitlement(localEntitlement, serverEntitlement)) {
    return false;
  }

  if (serverEntitlement === null) {
    return true;
  }

  return !isSameEntitlement(localEntitlement, serverEntitlement);
}

function hasServerCaughtUpToLocalEntitlement(
  localEntitlement: CurrentEntitlement,
  serverEntitlement: CurrentEntitlement | null,
) {
  if (!serverEntitlement) {
    return false;
  }

  if (isSameEntitlement(localEntitlement, serverEntitlement)) {
    return true;
  }

  return compareMembershipTiers(serverEntitlement.tier, localEntitlement.tier) > 0;
}

/** Exposes native purchase state by reconciling local RevenueCat data with the server billing record. */
export function useNativePayments() {
  const config = nativePayments.getConfig();
  const { isAuthenticated, isPaymentsReady, isPending: isAuthPending, paymentsError } = useAuth();
  // When a purchase or restore succeeds locally, keep a short window where the
  // hook can prefer device entitlement data while the server catches up.
  const [localEntitlementSyncExpiresAt, setLocalEntitlementSyncExpiresAt] = useState<number | null>(
    null,
  );
  const [state, setState] = useState<NativePaymentsState>({
    customerInfo: null,
    offerings: null,
    isLoading: config.isAvailable && !isPaymentsReady,
    isPurchasing: false,
    error: null,
    activePlanPriceIds: [],
    ...EMPTY_NATIVE_ENTITLEMENT_STATE,
  });
  const billingStatusQuery = useQuery(
    orpc.payments.getBillingStatus.queryOptions({
      enabled: !isAuthPending && isAuthenticated,
      staleTime: 0,
      refetchOnWindowFocus: false,
    }),
  );
  const refetchBillingStatus = billingStatusQuery.refetch;

  // Async purchase and snapshot calls may resolve after unmount, so state writes
  // are guarded with a simple mounted flag instead of extra cancellation layers.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const deriveEntitlementState = useCallback(
    (customerInfo: CustomerInfo | null) => {
      // All local entitlement state is derived from RevenueCat customerInfo so
      // purchase, restore, snapshot, and listener updates stay consistent.
      const activePlanPriceIds = nativePayments.getActivePlanPriceIds(customerInfo);
      const entitlementState = resolveNativeEntitlementState({
        customerInfo,
        plans: config.plans,
        activePlanPriceIds,
      });

      return {
        activePlanPriceIds,
        ...entitlementState,
      };
    },
    [config.plans],
  );

  // Keep a short local-first reconciliation window after purchase/restore so the
  // UI can reflect the fresh RevenueCat entitlement before the server catches up.
  const startLocalEntitlementSyncWindow = useCallback(() => {
    setLocalEntitlementSyncExpiresAt(Date.now() + LOCAL_ENTITLEMENT_SYNC_WINDOW_MS);
  }, []);

  const loadSnapshot = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!config.isAvailable) return;

      // Silent refreshes keep the current loading state to avoid flashing the UI
      // while still clearing any stale error before the next fetch attempt.
      setState((prev) => ({
        ...prev,
        isLoading: options?.silent ? prev.isLoading : true,
        error: null,
      }));

      try {
        const snapshot = await nativePayments.getSnapshot();
        if (!mountedRef.current) return;

        setState((prev) => ({
          ...prev,
          customerInfo: snapshot.customerInfo,
          offerings: snapshot.offerings,
          isLoading: false,
          ...deriveEntitlementState(snapshot.customerInfo),
        }));
      } catch (cause) {
        if (!mountedRef.current) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: nativePayments.toError(cause),
        }));
      }
    },
    [config.isAvailable, deriveEntitlementState],
  );

  useEffect(() => {
    if (!config.isAvailable || isPaymentsReady) {
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
    }));
  }, [config.isAvailable, isPaymentsReady]);

  useEffect(() => {
    if (!isPaymentsReady) {
      return;
    }

    // Delay the first snapshot until RevenueCat identity has been synced to the
    // current auth user, otherwise the hook may read a stale anonymous profile.
    loadSnapshot();
  }, [isPaymentsReady, loadSnapshot]);

  useEffect(() => {
    if (!config.isAvailable) return;

    // RevenueCat push updates can arrive outside explicit purchase flows, such as
    // account switches or subscription changes resolved by the SDK.
    return nativePayments.addCustomerInfoUpdateListener((info) => {
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        customerInfo: info,
        ...deriveEntitlementState(info),
      }));
    });
  }, [config.isAvailable, deriveEntitlementState]);

  const purchase = useCallback(
    async (planId: string, priceId: string) => {
      if (!isPaymentsReady) {
        throw paymentsError ?? new Error("RevenueCat identity is not ready for purchases");
      }
      setState((prev) => ({ ...prev, isPurchasing: true, error: null }));

      try {
        const result = await nativePayments.purchasePlanPrice({ planId, priceId });
        if (!mountedRef.current) {
          return {
            status: "purchased",
            customerInfo: result.customerInfo,
          } satisfies NativePurchaseResult;
        }

        setState((prev) => ({
          ...prev,
          isPurchasing: false,
          customerInfo: result.customerInfo,
          ...deriveEntitlementState(result.customerInfo),
        }));
        // The local SDK result is authoritative immediately after purchase, while
        // the server billing record may still be updating in the background.
        startLocalEntitlementSyncWindow();

        if (!isAuthPending && isAuthenticated) {
          await refetchBillingStatus();
        }

        return {
          status: "purchased",
          customerInfo: result.customerInfo,
        } satisfies NativePurchaseResult;
      } catch (cause) {
        const error = nativePayments.toError(cause);
        const isCancelled = isPurchaseCancelledError(cause);

        if (!mountedRef.current) {
          if (isCancelled) {
            return {
              status: "cancelled",
              customerInfo: null,
            } satisfies NativePurchaseResult;
          }

          throw error;
        }

        setState((prev) => ({
          ...prev,
          isPurchasing: false,
          // User cancellation is treated as a normal outcome for the caller and
          // should not leave an error banner behind in hook state.
          error: isCancelled ? null : error,
        }));

        if (isCancelled) {
          return {
            status: "cancelled",
            customerInfo: null,
          } satisfies NativePurchaseResult;
        }

        throw error;
      }
    },
    [
      deriveEntitlementState,
      isAuthPending,
      isAuthenticated,
      isPaymentsReady,
      paymentsError,
      refetchBillingStatus,
      startLocalEntitlementSyncWindow,
    ],
  );

  const restore = useCallback(async () => {
    if (!isPaymentsReady) {
      throw paymentsError ?? new Error("RevenueCat identity is not ready for restores");
    }
    setState((prev) => ({ ...prev, isPurchasing: true, error: null }));

    try {
      const customerInfo = await nativePayments.restorePurchases();
      if (!mountedRef.current) return customerInfo;

      setState((prev) => ({
        ...prev,
        isPurchasing: false,
        customerInfo,
        ...deriveEntitlementState(customerInfo),
      }));
      // Restores have the same local-first timing issue as purchases: the device
      // may know about the restored entitlement before the backend does.
      startLocalEntitlementSyncWindow();

      if (!isAuthPending && isAuthenticated) {
        await refetchBillingStatus();
      }

      return customerInfo;
    } catch (cause) {
      if (!mountedRef.current) return;

      const error = nativePayments.toError(cause);
      setState((prev) => ({ ...prev, isPurchasing: false, error }));
      throw error;
    }
  }, [
    deriveEntitlementState,
    isAuthPending,
    isAuthenticated,
    isPaymentsReady,
    paymentsError,
    refetchBillingStatus,
    startLocalEntitlementSyncWindow,
  ]);

  const serverEntitlementState = resolveServerEntitlementState(
    billingStatusQuery.data as ServerBillingStatusLike | undefined,
  );
  const isAwaitingInitialServerEntitlement =
    isAuthenticated && !billingStatusQuery.isFetchedAfterMount;

  const localEntitlementState = {
    currentEntitlement: state.currentEntitlement,
    activePlan: state.activePlan,
    activePrice: state.activePrice,
    hasLifetime: state.hasLifetime,
    hasActiveSubscription: state.hasActiveSubscription,
  };

  // During the local sync window, prefer device state only while the server is
  // missing or still behind the local entitlement.
  const isLocalEntitlementSyncing = localEntitlementSyncExpiresAt !== null;
  const serverCurrentEntitlement = serverEntitlementState?.currentEntitlement ?? null;

  // Only authenticated users need server reconciliation. Anonymous users have no
  // billing record to wait for, so local RevenueCat state is enough.
  const canPreferLocalEntitlement = isAuthenticated && isLocalEntitlementSyncing;

  const shouldShowLocalEntitlement = shouldUseLocalEntitlement(
    state.currentEntitlement,
    serverCurrentEntitlement,
    canPreferLocalEntitlement,
  );

  // Outside the local-first window, the server is the source of truth because it
  // decides cross-platform access and billing provider ownership.
  let resolvedEntitlementState = serverEntitlementState ?? localEntitlementState;

  if (shouldShowLocalEntitlement) {
    resolvedEntitlementState = localEntitlementState;
  }

  const isServerSyncFetchInFlight = canPreferLocalEntitlement && billingStatusQuery.isFetching;

  // This flag means entitlement reconciliation is still in progress, not that a
  // purchase sheet or restore action is currently running.
  const isMembershipSyncing = shouldShowLocalEntitlement || isServerSyncFetchInFlight;

  useEffect(() => {
    if (localEntitlementSyncExpiresAt === null) {
      return;
    }

    const timeoutMs = localEntitlementSyncExpiresAt - Date.now();
    if (timeoutMs <= 0) {
      setLocalEntitlementSyncExpiresAt(null);
      return;
    }

    // The local-first preference is explicitly time-bounded so stale device state
    // cannot shadow the server indefinitely if reconciliation never completes.
    const timeoutId = setTimeout(() => {
      setLocalEntitlementSyncExpiresAt(null);
    }, timeoutMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [localEntitlementSyncExpiresAt]);

  useEffect(() => {
    if (localEntitlementSyncExpiresAt === null || !isAuthenticated) {
      return;
    }

    // End the local-first window as soon as the server catches up to or surpasses
    // the local entitlement used during the temporary reconciliation period.
    if (
      hasServerCaughtUpToLocalEntitlement(
        state.currentEntitlement,
        serverEntitlementState?.currentEntitlement ?? null,
      )
    ) {
      setLocalEntitlementSyncExpiresAt(null);
    }
  }, [
    isAuthenticated,
    localEntitlementSyncExpiresAt,
    serverEntitlementState,
    state.currentEntitlement,
  ]);

  useEffect(() => {
    if (localEntitlementSyncExpiresAt === null || !isAuthenticated) {
      return;
    }

    // Poll billing status only while the local-first window is open.
    const intervalId = setInterval(() => {
      refetchBillingStatus().catch((error) => {
        console.warn("[native payments] Failed to sync billing status", error);
      });
    }, BILLING_STATUS_SYNC_POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, localEntitlementSyncExpiresAt, refetchBillingStatus]);

  return {
    isAvailable: config.isAvailable && isPaymentsReady,
    offerings: state.offerings,
    // For signed-in users, keep the hook loading until the first server billing
    // fetch finishes, otherwise the UI may briefly render downgraded access.
    isLoading: state.isLoading || isAwaitingInitialServerEntitlement,
    isPurchasing: state.isPurchasing,
    currentEntitlement: resolvedEntitlementState.currentEntitlement,
    activePrice: resolvedEntitlementState.activePrice,
    isMembershipSyncing,
    paymentsError,
    purchase,
    restore,
  };
}
