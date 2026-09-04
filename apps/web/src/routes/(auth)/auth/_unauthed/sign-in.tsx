import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { SignInForm } from "@/components/auth/sign-in-form";

export const Route = createFileRoute("/(auth)/auth/_unauthed/sign-in")({
  validateSearch: z.object({
    returnTo: z.string().optional(),
    planId: z.string().optional(),
    priceId: z.string().optional(),
  }),
  component: SignInForm,
});
