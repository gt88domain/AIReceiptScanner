import { createApiClient } from "@repo/api-client";
import type { AppRouterClient } from "@server/routers";
import { env } from "cloudflare:workers";

export const novelServerClient = createApiClient<AppRouterClient>({
  baseUrl: import.meta.env.VITE_SERVER_URL ?? "http://api-service.local",
  serviceBinding: env.API_SERVICE,
});
