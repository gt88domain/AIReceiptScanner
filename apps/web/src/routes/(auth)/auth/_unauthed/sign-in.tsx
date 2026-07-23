import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SignInForm } from "@/components/auth/sign-in-form";

const searchSchema = z.object({
  method: z.enum(["email", "otp"]).optional(),
});

export const Route = createFileRoute("/(auth)/auth/_unauthed/sign-in")({
  validateSearch: searchSchema,
  component: SignInRoute,
});

function SignInRoute() {
  const { method } = Route.useSearch();
  return <SignInForm initialMethod={method} />;
}
