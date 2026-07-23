import { createApiClient } from "@repo/api-client";
import type { AppRouterClient } from "@server/routers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const serverHostname = new URL(SERVER_URL).hostname;
const useLocalServer = serverHostname === "localhost" || serverHostname === "127.0.0.1";

function createServerClient(cookie: string) {
  return createApiClient<AppRouterClient>({
    baseUrl: SERVER_URL,
    getHeaders: () => ({ cookie }),
    serviceBinding: useLocalServer ? undefined : env.API_SERVICE,
  });
}

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const cookie = request?.headers.get("cookie") ?? "";
  const client = createServerClient(cookie);
  return client.getCurrentUser();
});

/** Server-side route guard; the allowlist itself remains in the API Worker's secret. */
export const getAdminAccess = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const cookie = request?.headers.get("cookie") ?? "";
  const client = createServerClient(cookie);
  return client.admin.getAccess();
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
