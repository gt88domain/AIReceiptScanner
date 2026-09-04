import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { getAuthUrls } from "@/configs/web-config";
import { authClient } from "@/lib/auth/auth-client";
import { sanitizeReturnTo } from "@/lib/auth/require-user";

type SocialProvider = "github" | "google";

export function useSocialSignIn() {
  const [loading, setLoading] = useState<SocialProvider | null>(null);
  const search = useSearch({ strict: false }) as { returnTo?: string };
  const returnTo = sanitizeReturnTo(search.returnTo);

  const signIn = (provider: SocialProvider) => {
    const authUrls = getAuthUrls({ returnTo });
    return authClient.signIn.social(
      {
        provider,
        callbackURL: authUrls.callbackURL,
        errorCallbackURL: authUrls.errorCallbackURL,
      },
      {
        onRequest: () => setLoading(provider),
        onError: (error) => {
          setLoading(null);
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );
  };

  return { signIn, loading };
}
