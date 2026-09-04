import { useForm } from "@tanstack/react-form";
import { Link, useSearch } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getAuthUrls } from "@/configs/web-config";
import { useTranslations } from "@/i18n";
import { authClient } from "@/lib/auth/auth-client";
import { sanitizeReturnTo } from "@/lib/auth/require-user";

export function EmailSignInForm() {
  const t = useTranslations();
  const search = useSearch({ strict: false }) as { returnTo?: string };
  const returnTo = sanitizeReturnTo(search.returnTo);
  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      const authUrls = getAuthUrls({ returnTo });
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
          callbackURL: authUrls.callbackURL,
        },
        {
          onSuccess: () => {
            toast.success(t("signIn.success"));
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email(t("auth.validation.invalidEmail")),
        password: z.string().min(1, t("auth.validation.passwordRequired")),
      }),
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field
          name="email"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>{t("auth.email")}</FieldLabel>
                <Input
                  id={field.name}
                  type="email"
                  placeholder={t("auth.enterEmail")}
                  aria-invalid={isInvalid}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
        <form.Field
          name="password"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <div className="flex items-center">
                  <FieldLabel htmlFor={field.name}>{t("auth.password")}</FieldLabel>
                  <Link
                    to="/auth/forgot-password"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    {t("signIn.forgotPassword")}
                  </Link>
                </div>
                <PasswordInput
                  id={field.name}
                  placeholder={t("auth.enterPassword")}
                  value={field.state.value}
                  aria-invalid={isInvalid}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
        <Field>
          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={!state.canSubmit || state.isSubmitting}
              >
                {state.isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
                {state.isSubmitting ? t("signIn.loggingIn") : t("signIn.login")}
              </Button>
            )}
          </form.Subscribe>
        </Field>
      </FieldGroup>
    </form>
  );
}
