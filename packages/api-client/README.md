# @repo/api-client

Shared oRPC client helpers for web and native apps.

## Usage

```ts
import { createApiClient, createOrpcUtils, createQueryClient } from "@repo/api-client";

export const queryClient = createQueryClient();
export const client = createApiClient({
	baseUrl: import.meta.env.VITE_SERVER_URL,
	credentials: "include",
});
export const orpc = createOrpcUtils(client);
```

## Native headers

```ts
import { createApiClient } from "@repo/api-client";
import { authClient } from "@/lib/auth-client";

export const client = createApiClient({
	baseUrl: process.env.EXPO_PUBLIC_SERVER_URL ?? "",
	getHeaders: () => {
		const cookie = authClient.getCookie();
		return cookie ? { Cookie: cookie } : {};
	},
});
```
