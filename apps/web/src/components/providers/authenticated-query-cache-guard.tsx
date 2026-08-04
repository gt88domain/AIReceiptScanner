import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { resetAuthenticatedQueryState } from "@/utils/orpc";

export function AuthenticatedQueryCacheGuard() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const previousUserId = useRef<string | null | undefined>(undefined);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      void resetAuthenticatedQueryState(queryClient);
    }
    previousUserId.current = userId;
  }, [queryClient, userId]);

  return null;
}
