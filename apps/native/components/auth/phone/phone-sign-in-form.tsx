import {
  CN_DIAL_PREFIX,
  CN_LOCAL_PHONE_DIGITS,
  CN_PHONE_NUMBER_REGEX,
  toCnE164PhoneNumber,
} from "@repo/shared";
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

/** Phone sign-in form that sends an OTP and navigates to the relative OTP route. */
export function PhoneSignInForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toastError, toastSuccess } = useToast();
  const [accentColor, fieldPlaceholderColor, mutedColor] = useThemeColor([
    "accent",
    "field-placeholder",
    "muted",
  ]);

  const form = useForm({
    defaultValues: {
      localDigits: "",
    },
    validators: {
      onChange: z.object({
        localDigits: z
          .string()
          .refine(
            (digits) => CN_PHONE_NUMBER_REGEX.test(toCnE164PhoneNumber(digits)),
            t("auth.validation.invalidPhone"),
          ),
      }),
    },
    onSubmit: async ({ value }) => {
      const phoneNumber = toCnE164PhoneNumber(value.localDigits);
      await authClient.phoneNumber.sendOtp(
        { phoneNumber },
        {
          onSuccess: () => {
            toastSuccess(t("auth.phoneCodeSent", { phoneNumber }));
            router.push({
              pathname: "./phone-otp",
              params: { phoneNumber },
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
        name="localDigits"
        children={(field) => {
          const errorMessage = getErrorMessage(field.state.meta.errors);
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid && Boolean(errorMessage);

          return (
            <View>
              <Text className="mb-2 text-base font-medium text-foreground">
                {t("auth.phoneNumber")}
              </Text>
              <View className="h-12 flex-row items-center rounded-lg border border-field-border bg-field px-4">
                <Text className="mr-2 text-base text-foreground" style={{ color: mutedColor }}>
                  {CN_DIAL_PREFIX}
                </Text>
                <TextInput
                  className="flex-1 text-base leading-tight text-field-foreground"
                  id={field.name}
                  placeholder={t("auth.phoneNumberPlaceholder")}
                  placeholderTextColor={fieldPlaceholderColor}
                  keyboardType="number-pad"
                  autoComplete="tel-national"
                  maxLength={CN_LOCAL_PHONE_DIGITS}
                  cursorColor={accentColor}
                  selectionColor={accentColor}
                  textContentType="telephoneNumber"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChangeText={(text) =>
                    field.handleChange(text.replace(/\D/g, "").slice(0, CN_LOCAL_PHONE_DIGITS))
                  }
                />
              </View>
              <Text className="mt-2 text-sm text-muted">{t("auth.phoneNumberDescription")}</Text>
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
        {(state) => {
          const busy = !state.canSubmit || state.isSubmitting;
          return (
            <Button
              variant="primary"
              feedbackVariant="scale-ripple"
              onPress={() => form.handleSubmit()}
              isDisabled={busy}
              className={`h-12 items-center justify-center rounded-md ${busy ? "opacity-60" : ""}`}
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
          );
        }}
      </form.Subscribe>
    </View>
  );
}
