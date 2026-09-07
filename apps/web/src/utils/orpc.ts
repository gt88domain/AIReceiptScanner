import { createApiClient, createOrpcUtils, createQueryClient } from "@repo/api-client";
import type { AppRouterClient } from "@server/routers";
import type { QueryClient } from "@tanstack/react-query";
import { createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { toast } from "sonner";

export type OrpcUtils = ReturnType<typeof createOrpcUtils<AppRouterClient>>;

export type WebRequestContext = {
  orpc: OrpcUtils;
  queryClient: QueryClient;
};

// Get service binding if available (server-side only)
function getServiceBinding() {
  const serverUrl = import.meta.env.VITE_SERVER_URL;
  if (!serverUrl) return typeof API_SERVICE === "undefined" ? undefined : API_SERVICE;

  const serverHostname = new URL(serverUrl).hostname;
  const useLocalServer = serverHostname === "localhost" || serverHostname === "127.0.0.1";
  if (typeof window !== "undefined" || useLocalServer) return undefined;
  return typeof API_SERVICE === "undefined" ? undefined : API_SERVICE;
}

function createBrowserQueryClient() {
  let queryClient: QueryClient;
  queryClient = createQueryClient({
    onError: (error, failedQuery) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Error: ${message}`, {
        action: {
          label: "retry",
          onClick: () => {
            void queryClient.refetchQueries({
              predicate: (query) => query.queryHash === failedQuery.queryHash,
              type: "all",
            });
          },
        },
      });
    },
  });
  return queryClient;
}

const getServerRequestHeaders = createServerOnlyFn(() => {
  const request = getRequest();
  return {
    authorization: request.headers.get("authorization") ?? "",
    cookie: request.headers.get("cookie") ?? "",
  };
});

function createWebRequestContext(): WebRequestContext {
  const isServer = typeof window === "undefined";
  const client = createApiClient<AppRouterClient>({
    baseUrl: import.meta.env.VITE_SERVER_URL,
    credentials: "include",
    getHeaders: isServer ? getServerRequestHeaders : undefined,
    serviceBinding: getServiceBinding(),
  });

  return {
    orpc: createOrpcUtils<AppRouterClient>(client),
    queryClient: isServer ? createQueryClient() : createBrowserQueryClient(),
  };
}

let browserContext: WebRequestContext | undefined;

/** Creates a request-isolated server context and a single browser context. */
export function getWebRequestContext(): WebRequestContext {
  if (typeof window === "undefined") {
    return createWebRequestContext();
  }

  browserContext ??= createWebRequestContext();
  return browserContext;
}

/** Remove every cached result before or after an authentication identity changes. */
export async function resetAuthenticatedQueryState(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
}
