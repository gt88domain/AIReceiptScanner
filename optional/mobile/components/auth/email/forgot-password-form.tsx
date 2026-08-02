import { useForm } from "@tanstack/react-form";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as z from "zod";
import { Text } from "@/components/ui/text";
import { appConfig, getAuthConfig } from "@/configs/app-config";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { getErrorMessage } from "@/utils/error";

const authConfig = getAuthConfig();

export function ForgotPasswordForm() {
  const { top } = useSafeAreaInsets();
  const { toastError, toastSuccess } = useToast();
  const { t } = useTranslation();
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
      await authClient.requestPasswordReset(
        {
          email: value.email,
          redirectTo: authConfig.resetPasswordURL,
        },
        {
          onRequest: () => {},
          onResponse: () => {},
          onSuccess: () => {
            toastSuccess(t("forgotPassword.success"));
          },
          onError: (error) => {
            console.log(error);
            toastError(error.error.message || error.error.statusText);
          },
        },
      );
    },
  });

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      bottomOffset={appConfig.keyboardBottomOffset}
    >
      <View
        className="flex-1 justify-center px-6 py-24"
        style={{ paddingTop: top + appConfig.safeAreaTop }}
      >
        <View className="mx-auto w-full max-w-sm">
          <Animated.View className="mb-8" entering={FadeInUp.delay(100)}>
            <View className="mb-2">
              <Text className="mb-2 text-3xl font-bold tracking-tight text-foreground">
                {t("forgotPassword.title")}
              </Text>
              <Text className="text-sm text-muted">{t("forgotPassword.description")}</Text>
            </View>
          </Animated.View>

          <Animated.View className="mb-8" entering={FadeInDown.delay(200)}>
            <form.Field
              name="email"
              children={(field) => {
                const errorMessage = getErrorMessage(field.state.meta.errors);
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid && Boolean(errorMessage);

                return (
                  <View className="mb-4">
                    <Text className="mb-2 text-base font-medium text-foreground">
                      {t("auth.email")}
                    </Text>
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
                        {t("forgotPassword.sending")}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-base font-semibold text-accent-foreground">
                      {t("forgotPassword.sendLink")}
                    </Text>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </Animated.View>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
