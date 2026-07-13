import { useForm } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { TextInput, View } from "react-native";
import * as z from "zod";
import { Text } from "@/components/ui/text";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { getErrorMessage } from "@/utils/error";

export function EmailOtpRequestForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toastError, toastSuccess } = useToast();
  const [accentColor, fieldPlaceholderColor] = useThemeColor(["accent", "field-placeholder"]);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onChange: z.object({
        email: z.email(t("auth.validation.invalidEmail")),
      }),
    },
    onSubmit: async ({ value }) => {
      const email = value.email.trim().toLowerCase();
      await authClient.emailOtp.sendVerificationOtp(
        {
          email,
          type: "sign-in",
        },
        {
          onSuccess: () => {
            toastSuccess(t("auth.emailCodeSent", { email }));
            router.push({
              pathname: "./email-otp",
              params: { email },
            });
          },
          onError: (error) => {
            toastError(error.error.message || error.error.statusText);
          },
        },
      );
    },
  });

  return (
    <View className="gap-4">
      <form.Field
        name="email"
        children={(field) => {
          const errorMessage = getErrorMessage(field.state.meta.errors);
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid && Boolean(errorMessage);

          return (
            <View>
              <Text className="mb-2 text-base font-medium text-foreground">{t("auth.email")}</Text>
              <View className="h-12 justify-center rounded-lg border border-field-border bg-field px-4">
                <TextInput
                  className="flex-1 text-base leading-tight text-field-foreground"
                  id={field.name}
                  placeholder={t("auth.emailPlaceholder")}
                  placeholderTextColor={fieldPlaceholderColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  cursorColor={accentColor}
                  selectionColor={accentColor}
                  textContentType="emailAddress"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChangeText={field.handleChange}
                />
              </View>
              <Text className="mt-2 text-sm text-muted">{t("auth.emailOtpDescription")}</Text>
              <View className="mt-1 min-h-4">
                <Text className={`text-xs ${isInvalid ? "text-danger" : "text-transparent"}`}>
                  {isInvalid ? errorMessage : " "}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <form.Subscribe>
        {(state) => (
          <Button
            variant="primary"
            feedbackVariant="scale-ripple"
            onPress={() => form.handleSubmit()}
            isDisabled={!state.canSubmit || state.isSubmitting}
            className={`h-12 items-center justify-center rounded-md ${
              !state.canSubmit || state.isSubmitting ? "opacity-60" : ""
            }`}
          >
            {state.isSubmitting ? (
              <View className="flex-row items-center">
                <Spinner size="sm" className="mr-2 text-accent-foreground" />
                <Text className="text-base font-semibold text-accent-foreground">
                  {t("auth.sendingCode")}
                </Text>
              </View>
            ) : (
              <Text className="text-base font-semibold text-accent-foreground">
                {t("auth.sendCode")}
              </Text>
            )}
          </Button>
        )}
      </form.Subscribe>
    </View>
  );
}
