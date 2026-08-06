// https://better-auth.com/docs/integrations/expo#initialize-better-auth-client
import { createAuthClient } from "better-auth/react";
import { customSessionClient, emailOTPClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { getAuthConfig } from "@/configs/app-config";
import { getCurrentLocale } from "@/i18n";

const authConfig = getAuthConfig();

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_SERVER_API_URL,
  fetchOptions: {
    onRequest: (context) => {
      const headers = new Headers(context.headers ?? {});
      headers.set("accept-language", getCurrentLocale());
      return { ...context, headers };
    },
  },
  plugins: [
    expoClient({
      scheme: authConfig.scheme,
      storagePrefix: authConfig.storagePrefix,
      storage: SecureStore,
    }),
    customSessionClient(),
    emailOTPClient(),
  ],
});

export type UserProps = typeof authClient.$Infer.Session.user;
