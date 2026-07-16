import { createApiClient, createOrpcUtils, createQueryClient } from "@repo/api-client";
import type { AppRouterClient } from "@server/routers";
import { toast } from "sonner";

export const queryClient = createQueryClient({
  onError: (error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    toast.error(`Error: ${message}`, {
      action: {
        label: "retry",
        onClick: () => {
          queryClient.invalidateQueries();
        },
      },
    });
  },
});

// Get service binding if available (server-side only)
function getServiceBinding() {
  const serverUrl = import.meta.env.VITE_SERVER_URL;
  if (!serverUrl) return typeof API_SERVICE === "undefined" ? undefined : API_SERVICE;

  const serverHostname = new URL(serverUrl).hostname;
  const useLocalServer = serverHostname === "localhost" || serverHostname === "127.0.0.1";
  if (typeof window !== "undefined" || useLocalServer) return undefined;
  return typeof API_SERVICE === "undefined" ? undefined : API_SERVICE;
}

export const client = createApiClient<AppRouterClient>({
  baseUrl: import.meta.env.VITE_SERVER_URL,
  credentials: "include",
  serviceBinding: getServiceBinding(),
});

export const orpc = createOrpcUtils<AppRouterClient>(client);
