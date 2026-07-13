import { useState, useEffect, useMemo, useContext, createContext, useRef, ReactNode } from "react";
import { authClient } from "@/lib/auth/auth.client";
import { nativePayments } from "@/lib/payments/revenuecat";
import { isEmpty } from "lodash-es";

type Session = typeof authClient.$Infer.Session | null;
type User = typeof authClient.$Infer.Session.user | null;

type AuthContextValue = {
  isPending: boolean;
  isAuthenticated: boolean;
  isPaymentsReady: boolean;
  session: Session;
  user: User;
  refetchSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessionQuery = authClient.useSession();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isPaymentsReady, setIsPaymentsReady] = useState(
    nativePayments.getConfig().availability !== "available",
  );
  const lastSyncedUserIdRef = useRef<string | null | undefined>(undefined);
  const session = sessionQuery.data ?? null;
  const user = session?.user ?? null;
  const isAuthenticated = !isEmpty(user);
  const isPending = !hasInitialized;

  useEffect(() => {
    if (!sessionQuery.isPending) {
      setHasInitialized(true);
    }
  }, [sessionQuery.isPending]);

  useEffect(() => {
    if (!hasInitialized || nativePayments.getConfig().availability !== "available") {
      return;
    }

    const nextUserId = user?.id ?? null;

    if (lastSyncedUserIdRef.current === nextUserId) {
      setIsPaymentsReady(true);
      return;
    }

    lastSyncedUserIdRef.current = nextUserId;
    setIsPaymentsReady(false);

    nativePayments
      .syncAppUser(nextUserId)
      .then(() => {
        setIsPaymentsReady(true);
      })
      .catch((error) => {
        console.warn("[native payments] Failed to sync app user", error);
        lastSyncedUserIdRef.current = undefined;
        setIsPaymentsReady(true);
      });
  }, [hasInitialized, user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isPending,
      isAuthenticated,
      isPaymentsReady,
      session,
      user,
      refetchSession: () =>
        sessionQuery.refetch({
          query: {
            disableCookieCache: true,
          },
        }),
    }),
    [isAuthenticated, isPaymentsReady, isPending, session, sessionQuery, user],
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
