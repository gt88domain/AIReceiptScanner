import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { startNativeOAuth } from "@/lib/auth/oauth-handoff";
import { useAuth } from "@/providers/auth-provider";

type SocialProvider = "apple" | "github" | "google";

function getSocialSignInErrorMessage(error: unknown, fallbackMessage: string) {
  if (error && typeof error === "object" && "error" in error) {
    const authError = (error as { error?: { message?: string; statusText?: string } }).error;
    if (authError?.message) {
      return authError.message;
    }
    if (authError?.statusText) {
      return authError.statusText;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function isAppleSignInCancelled(error: unknown) {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "ERR_REQUEST_CANCELED"
  );
}

function buildAppleIdTokenUser(credential: AppleAuthentication.AppleAuthenticationCredential) {
  const firstName = credential.fullName?.givenName ?? undefined;
  const lastName = credential.fullName?.familyName ?? undefined;
  const email = credential.email ?? undefined;

  if (!firstName && !lastName && !email) {
    return undefined;
  }

  return {
    ...(email ? { email } : {}),
    ...(firstName || lastName
      ? {
          name: {
            ...(firstName ? { firstName } : {}),
            ...(lastName ? { lastName } : {}),
          },
        }
      : {}),
  };
}

export function useSocialSignIn() {
  const [loading, setLoading] = useState<SocialProvider | null>(null);
  const router = useRouter();
  const { t } = useTranslation();
  const { toastError, toastSuccess } = useToast();
  const { refetchSession } = useAuth();

  const signIn = async (provider: SocialProvider) => {
    if (provider === "apple") {
      setLoading(provider);

      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        const identityToken = credential.identityToken;

        if (!identityToken) {
          throw new Error(t("common.error"));
        }

        await authClient.signIn.social(
          {
            provider,
            idToken: {
              token: identityToken,
              ...(buildAppleIdTokenUser(credential)
                ? { user: buildAppleIdTokenUser(credential) }
                : {}),
            },
          },
          {
            onSuccess: async () => {
              toastSuccess(t("auth.signInSuccess"));
              router.dismissTo("/(tabs)/(home)");
            },
            onError: (error) => {
              toastError(getSocialSignInErrorMessage(error, t("common.error")));
            },
          },
        );
      } catch (error) {
        if (!isAppleSignInCancelled(error)) {
          toastError(getSocialSignInErrorMessage(error, t("common.error")));
        }
      } finally {
        setLoading(null);
      }

      return;
    }

    try {
      setLoading(provider);
      if (await startNativeOAuth(provider)) {
        await refetchSession();
        router.dismissTo("/(tabs)/(home)");
      }
    } catch (error) {
      toastError(getSocialSignInErrorMessage(error, t("common.error")));
    } finally {
      setLoading(null);
    }
  };

  return { signIn, loading };
}
