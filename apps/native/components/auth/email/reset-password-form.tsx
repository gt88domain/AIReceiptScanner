import { MaterialIcons } from "@expo/vector-icons";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as z from "zod";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { useAuth } from "@/providers/auth-provider";
import { dismissToSignIn } from "@/utils/route";
import { getErrorMessage } from "@/utils/error";

type ResetPasswordFormProps = {
  error?: string;
  token?: string;
};

export function ResetPasswordForm({ error, token }: ResetPasswordFormProps) {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { t } = useTranslation();
  const { toastError, toastSuccess } = useToast();
  const { isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accentColor, fieldPlaceholderColor, mutedColor] = useThemeColor([
    "accent",
    "field-placeholder",
    "muted",
  ]);
  const hasValidToken = Boolean(token) && error !== "INVALID_TOKEN";

  const form = useForm({
    defaultValues: {
      confirmPassword: "",
      password: "",
    },
    validators: {
      onSubmit: z
        .object({
          password: z.string().min(8, t("auth.validation.passwordMinLength", { min: 8 })),
          confirmPassword: z.string(),
        })
        .refine((value) => value.password === value.confirmPassword, {
          message: t("resetPassword.passwordsNotMatch"),
          path: ["confirmPassword"],
        }),
    },
    onSubmit: async ({ value }) => {
      await authClient.resetPassword(
        {
          newPassword: value.password,
          token,
        },
        {
          onSuccess: () => {
            toastSuccess(t("resetPassword.success"));

            if (isAuthenticated) {
              if (router.canDismiss()) {
                router.dismissTo("/(tabs)/(profile)/security");
                return;
              }

              router.replace("/(tabs)/(profile)/security");
              return;
            }

            dismissToSignIn(router);
          },
          onError: (authError) => {
            toastError(authError.error.message || authError.error.statusText);
          },
        },
      );
    },
  });

  const invalidRouteLabel = useMemo(
    () => (isAuthenticated ? t("resetPassword.backToSecurity") : t("resetPassword.requestNewLink")),
    [isAuthenticated, t],
  );

  function handleInvalidRoute() {
    if (isAuthenticated) {
      if (router.canDismiss()) {
        router.dismissTo("/(tabs)/(profile)/security");
        return;
      }

      router.replace("/(tabs)/(profile)/security");
      return;
    }

    if (router.canDismiss()) {
      router.dismissTo("/(auth)/forgot-password");
      return;
    }

    router.replace("/(auth)/forgot-password");
  }

  return (
    <>
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
                  {t("resetPassword.title")}
                </Text>
                <Text className="text-sm text-muted">
                  {hasValidToken
                    ? t("resetPassword.description")
                    : t("resetPassword.invalidTokenDescription")}
                </Text>
              </View>
            </Animated.View>

            {!hasValidToken ? (
              <Animated.View className="gap-6" entering={FadeInDown.delay(200)}>
                <View className="gap-3 rounded-2xl bg-surface px-5 py-6">
                  <View className="flex-row items-center gap-3">
                    <MaterialIcons name="error-outline" size={20} color={mutedColor} />
                    <Text className="flex-1 text-base font-semibold text-foreground">
                      {t("resetPassword.invalidToken")}
                    </Text>
                  </View>
                </View>

                <Button
                  variant="primary"
                  feedbackVariant="scale-ripple"
                  onPress={handleInvalidRoute}
                  className="h-12 items-center justify-center rounded-md"
                >
                  <Text className="text-base font-semibold text-accent-foreground">
                    {invalidRouteLabel}
                  </Text>
                </Button>
              </Animated.View>
            ) : (
              <Animated.View className="mb-8" entering={FadeInDown.delay(200)}>
                <form.Field
                  name="password"
                  children={(field) => {
                    const errorMessage = getErrorMessage(field.state.meta.errors);
                    const isInvalid =
                      field.state.meta.isTouched &&
                      !field.state.meta.isValid &&
                      Boolean(errorMessage);

                    return (
                      <View className="mb-4">
                        <Text className="mb-2 text-base font-medium text-foreground">
                          {t("resetPassword.newPassword")}
                        </Text>
                        <View className="h-12 flex-row items-center rounded-lg border border-field-border bg-field px-4">
                          <View className="flex-1">
                            <TextInput
                              id={field.name}
                              className="flex-1 text-base leading-tight text-field-foreground"
                              placeholder={t("auth.createPasswordPlaceholder")}
                              placeholderTextColor={fieldPlaceholderColor}
                              secureTextEntry={!showPassword}
                              autoComplete="new-password"
                              cursorColor={accentColor}
                              selectionColor={accentColor}
                              textContentType="newPassword"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChangeText={field.handleChange}
                            />
                          </View>
                          <Pressable
                            onPress={() => setShowPassword((value) => !value)}
                            className="ml-3"
                          >
                            <MaterialIcons
                              name={showPassword ? "visibility-off" : "visibility"}
                              size={18}
                              color={mutedColor}
                            />
                          </Pressable>
                        </View>
                        <View className="mt-1 min-h-4">
                          <Text
                            className={`text-xs ${isInvalid ? "text-danger" : "text-transparent"}`}
                          >
                            {isInvalid ? errorMessage : " "}
                          </Text>
                        </View>
                      </View>
                    );
                  }}
                />

                <form.Field
                  name="confirmPassword"
                  children={(field) => {
                    const errorMessage = getErrorMessage(field.state.meta.errors);
                    const isInvalid =
                      field.state.meta.isTouched &&
                      !field.state.meta.isValid &&
                      Boolean(errorMessage);

                    return (
                      <View className="mb-6">
                        <Text className="mb-2 text-base font-medium text-foreground">
                          {t("resetPassword.confirmPassword")}
                        </Text>
                        <View className="h-12 flex-row items-center rounded-lg border border-field-border bg-field px-4">
                          <View className="flex-1">
                            <TextInput
                              id={field.name}
                              className="flex-1 text-base leading-tight text-field-foreground"
                              placeholder={t("resetPassword.confirmNewPassword")}
                              placeholderTextColor={fieldPlaceholderColor}
                              secureTextEntry={!showConfirmPassword}
                              autoComplete="new-password"
                              cursorColor={accentColor}
                              selectionColor={accentColor}
                              textContentType="newPassword"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChangeText={field.handleChange}
                            />
                          </View>
                          <Pressable
                            onPress={() => setShowConfirmPassword((value) => !value)}
                            className="ml-3"
                          >
                            <MaterialIcons
                              name={showConfirmPassword ? "visibility-off" : "visibility"}
                              size={18}
                              color={mutedColor}
                            />
                          </Pressable>
                        </View>
                        <View className="mt-1 min-h-4">
                          <Text
                            className={`text-xs ${isInvalid ? "text-danger" : "text-transparent"}`}
                          >
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
                          <Text className="font-semibold text-accent-foreground">
                            {t("resetPassword.resetting")}
                          </Text>
                        </View>
                      ) : (
                        <Text className="font-semibold text-accent-foreground">
                          {t("resetPassword.reset")}
                        </Text>
                      )}
                    </Button>
                  )}
                </form.Subscribe>
              </Animated.View>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  );
}
