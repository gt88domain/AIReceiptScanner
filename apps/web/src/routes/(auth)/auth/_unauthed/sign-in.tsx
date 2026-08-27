import { createFileRoute } from "@tanstack/react-router";
import { SignInForm } from "@/components/auth/sign-in-form";

export const Route = createFileRoute("/(auth)/auth/_unauthed/sign-in")({
  component: SignInForm,
});
