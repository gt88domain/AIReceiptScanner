import { createApiClient, createOrpcUtils, createQueryClient } from "@repo/api-client";
import type { AppRouterClient } from "@server/routers";
import { getCurrentLocale } from "@/i18n";
import { authClient } from "@/lib/auth/auth.client";

export const baseUrl = process.env.EXPO_PUBLIC_SERVER_API_URL;

if (!baseUrl) {
  throw new Error("EXPO_PUBLIC_SERVER_API_URL is required");
}

export function createNativeRequestHeaders() {
  const headers = new Headers();
  const cookie = authClient.getCookie();

  headers.set("accept-language", getCurrentLocale());

  if (cookie) {
    headers.set("cookie", cookie);
  }

  return headers;
}

export const client = createApiClient<AppRouterClient>({
  baseUrl,
  getHeaders: () => createNativeRequestHeaders(),
});

export const queryClient = createQueryClient();

export const orpc = createOrpcUtils<AppRouterClient>(client);
