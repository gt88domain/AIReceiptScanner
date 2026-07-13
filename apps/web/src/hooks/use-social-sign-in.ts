import { useState } from "react";
import { toast } from "sonner";
import { getAuthUrls } from "@/configs/web-config";
import { authClient } from "@/lib/auth/auth-client";

type SocialProvider = "github" | "google";

export function useSocialSignIn() {
  const [loading, setLoading] = useState<SocialProvider | null>(null);

  const signIn = (provider: SocialProvider) => {
    const authUrls = getAuthUrls();
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
