import { Redirect } from "expo-router";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { appConfig } from "@/configs/app-config";

export default function SignInScreen() {
  if (!appConfig.auth.methods.emailPasswordEnabled) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <SignUpForm />;
}
