import { createAuthClient } from "better-auth/react";
import { getCurrentLocale } from "@/i18n";
import { customSessionClient, emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SERVER_URL,
  plugins: [customSessionClient(), emailOTPClient()],
  fetchOptions: {
    credentials: "include",
    onRequest: (context) => {
      const headers = new Headers(context.headers ?? {});
      headers.set("accept-language", getCurrentLocale());
      return { ...context, headers };
    },
  },
});
