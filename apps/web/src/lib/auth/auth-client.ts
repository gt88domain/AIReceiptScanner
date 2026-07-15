import { createAuthClient } from "better-auth/react";
import { getCurrentLocale } from "@/i18n";
import { emailOTPClient, phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_SERVER_URL,
  // Server plugins are disabled; keep these only for legacy guarded-screen type inference.
  plugins: [emailOTPClient(), phoneNumberClient()],
  fetchOptions: {
    credentials: "include",
    onRequest: (context) => {
      const headers = new Headers(context.headers ?? {});
      headers.set("accept-language", getCurrentLocale());
      return { ...context, headers };
    },
  },
});
