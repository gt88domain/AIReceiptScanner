import { Redirect } from "expo-router";
import { ForgotPasswordForm } from "@/components/auth/email/forgot-password-form";
import { appConfig } from "@/configs/app-config";

export default function ForgotPasswordScreen() {
  if (!appConfig.auth.methods.emailPasswordEnabled) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <ForgotPasswordForm />;
}
