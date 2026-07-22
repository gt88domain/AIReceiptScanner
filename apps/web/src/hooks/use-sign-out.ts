import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { useAppQueryClient } from "./use-orpc";
import { resetAuthenticatedQueryState } from "@/utils/orpc";

export const useSignOut = () => {
  const navigate = useNavigate();
  const queryClient = useAppQueryClient();

  const signOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          void resetAuthenticatedQueryState(queryClient);
          navigate({ to: "/" });
        },
        onError: (error) => {
          console.error(error);
          toast.error(error.error.message || error.error.statusText);
        },
      },
    });
  };

  return {
    signOut,
  };
};
