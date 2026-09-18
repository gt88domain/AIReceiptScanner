import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";
import { getFirstSearchParam } from "@repo/shared";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { completeNativeOAuth } from "@/lib/auth/oauth-handoff";
import { useAuth } from "@/providers/auth-provider";
import { dismissToHome, dismissToSignIn } from "@/utils/route";

type RunAuthCallbackFlowOptions = {
  errorParam: string | undefined;
  flowParam: string | undefined;
  handoffParam: string | undefined;
  missingCookieMessage: string;
  signInSuccessMessage: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onNavigateHome: () => void;
  onNavigateSignIn: () => void;
  onRefetchSession: () => Promise<void>;
  isUnmounted: () => boolean;
};

// Execute callback flow once for a unique callback payload.
async function runAuthCallbackFlow({
  errorParam,
  flowParam,
  handoffParam,
  missingCookieMessage,
  signInSuccessMessage,
  onError,
  onSuccess,
  onNavigateHome,
  onNavigateSignIn,
  onRefetchSession,
  isUnmounted,
}: RunAuthCallbackFlowOptions): Promise<void> {
  if (errorParam) {
    onError(errorParam);
    onNavigateSignIn();
    return;
  }

  if (flowParam === "verify-email") {
    onSuccess(signInSuccessMessage);
    onNavigateSignIn();
    return;
  }

  if (!handoffParam) {
    onError(missingCookieMessage);
    onNavigateSignIn();
    return;
  }

  await completeNativeOAuth(handoffParam);

  const sessionResult = await authClient.getSession();
  if (isUnmounted()) {
    return;
  }

  if (sessionResult.data?.user) {
    await onRefetchSession();
    if (isUnmounted()) {
      return;
    }
    onNavigateHome();
    return;
  }

  onError(
    sessionResult.error?.message ||
      sessionResult.error?.statusText ||
      "Authentication session was not created.",
  );
  onNavigateSignIn();
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toastError, toastSuccess } = useToast();
  const { refetchSession } = useAuth();
  const handledKeysRef = React.useRef(new Set<string>());
  const unmountedRef = React.useRef(false);
  const actionsRef = React.useRef({
    toastError,
    toastSuccess,
    refetchSession,
    navigateHome: () => dismissToHome(router),
    navigateSignIn: () => dismissToSignIn(router),
  });

  const params = useLocalSearchParams<{
    expoFlow?: string | string[];
    error?: string | string[];
    flow?: string | string[];
  }>();
  const handoffParam = React.useMemo(() => getFirstSearchParam(params.expoFlow), [params.expoFlow]);
  const errorParam = React.useMemo(() => getFirstSearchParam(params.error), [params.error]);
  const flowParam = React.useMemo(() => getFirstSearchParam(params.flow), [params.flow]);
  const handleKey = React.useMemo(
    () =>
      JSON.stringify({
        error: errorParam ?? null,
        flow: flowParam ?? null,
        handoff: handoffParam ?? null,
      }),
    [handoffParam, errorParam, flowParam],
  );

  React.useEffect(() => {
    actionsRef.current = {
      toastError,
      toastSuccess,
      refetchSession,
      navigateHome: () => dismissToHome(router),
      navigateSignIn: () => dismissToSignIn(router),
    };
  }, [refetchSession, router, toastError, toastSuccess]);

  React.useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  React.useEffect(() => {
    if (handledKeysRef.current.has(handleKey)) {
      return;
    }

    handledKeysRef.current.add(handleKey);
    runAuthCallbackFlow({
      errorParam,
      flowParam,
      handoffParam,
      missingCookieMessage: t("auth.callbackCookieMissing"),
      signInSuccessMessage: t("auth.emailVerified"),
      onError: (message) => actionsRef.current.toastError(message),
      onSuccess: (message) => actionsRef.current.toastSuccess(message),
      onNavigateHome: () => actionsRef.current.navigateHome(),
      onNavigateSignIn: () => actionsRef.current.navigateSignIn(),
      onRefetchSession: () => actionsRef.current.refetchSession(),
      isUnmounted: () => unmountedRef.current,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown callback error";
      actionsRef.current.toastError(message);
      actionsRef.current.navigateSignIn();
    });
  }, [handoffParam, errorParam, flowParam, handleKey, t]);

  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator />
    </View>
  );
}
