import { useQueryClient } from "@tanstack/react-query";
import {
  useState,
  useEffect,
  useMemo,
  useContext,
  createContext,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth/auth.client";
import { nativePayments } from "@/lib/payments/revenuecat";
import { isEmpty } from "lodash-es";

type Session = typeof authClient.$Infer.Session | null;
type User = typeof authClient.$Infer.Session.user | null;

type AuthContextValue = {
  isPending: boolean;
  isAuthenticated: boolean;
  isPaymentsReady: boolean;
  paymentsError: Error | null;
  session: Session;
  user: User;
  refetchSession: () => Promise<void>;
  retryPaymentsSync: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessionQuery = authClient.useSession();
  const queryClient = useQueryClient();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isPaymentsReady, setIsPaymentsReady] = useState(
    nativePayments.getConfig().availability !== "available",
  );
  const lastSyncedUserIdRef = useRef<string | null | undefined>(undefined);
  const syncAttemptRef = useRef(0);
  const session = sessionQuery.data ?? null;
  const user = session?.user ?? null;
  const isAuthenticated = !isEmpty(user);
  const isPending = !hasInitialized;

  useEffect(() => {
    if (!sessionQuery.isPending) {
      setHasInitialized(true);
    }
  }, [sessionQuery.isPending]);

  const [paymentsError, setPaymentsError] = useState<Error | null>(null);

  const syncPaymentsIdentity = useCallback(async (nextUserId: string | null) => {
    const attempt = ++syncAttemptRef.current;
    lastSyncedUserIdRef.current = nextUserId;
    setIsPaymentsReady(false);
    setPaymentsError(null);
    await queryClient.cancelQueries();
    queryClient.clear();

    try {
      await nativePayments.syncAppUser(nextUserId);
      if (attempt !== syncAttemptRef.current) return;
      setIsPaymentsReady(true);
    } catch (cause) {
      if (attempt !== syncAttemptRef.current) return;
      const error = nativePayments.toError(cause);
      console.warn("[native payments] Failed to sync app user", error);
      lastSyncedUserIdRef.current = undefined;
      setPaymentsError(error);
      setIsPaymentsReady(false);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!hasInitialized || nativePayments.getConfig().availability !== "available") {
      return;
    }

    const nextUserId = user?.id ?? null;

    if (lastSyncedUserIdRef.current === nextUserId) {
      return;
    }

    void syncPaymentsIdentity(nextUserId);
  }, [hasInitialized, syncPaymentsIdentity, user?.id]);

  const retryPaymentsSync = useCallback(async () => {
    if (nativePayments.getConfig().availability !== "available") return;
    await syncPaymentsIdentity(user?.id ?? null);
  }, [syncPaymentsIdentity, user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isPending,
      isAuthenticated,
      isPaymentsReady,
      paymentsError,
      session,
      user,
      refetchSession: () =>
        sessionQuery.refetch({
          query: {
            disableCookieCache: true,
          },
        }),
      retryPaymentsSync,
    }),
    [
      isAuthenticated,
      isPaymentsReady,
      isPending,
      paymentsError,
      retryPaymentsSync,
      session,
      sessionQuery,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
