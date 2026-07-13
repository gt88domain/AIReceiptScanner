import { Redirect, useLocalSearchParams } from "expo-router";
import { getFirstSearchParam } from "@repo/shared";
import { ResetPasswordForm } from "@/components/auth/email/reset-password-form";
import { appConfig } from "@/configs/app-config";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    error?: string | string[];
    token?: string | string[];
  }>();

  if (!appConfig.auth.methods.emailPasswordEnabled) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <ResetPasswordForm
      token={getFirstSearchParam(params.token)}
      error={getFirstSearchParam(params.error)}
    />
  );
}
