import { useForm } from "@tanstack/react-form";
import { MaterialIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, TextInput, View } from "react-native";
import * as z from "zod";
import { Text } from "@/components/ui/text";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { getErrorMessage } from "@/utils/error";

export function EmailSignInForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toastError, toastSuccess } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [accentColor, fieldPlaceholderColor, mutedColor] = useThemeColor([
    "accent",
    "field-placeholder",
    "muted",
  ]);

  const passwordForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onChange: z.object({
        email: z.email(t("auth.validation.invalidEmail")),
        password: z.string().min(1, t("auth.validation.passwordRequired")),
      }),
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onRequest: () => {},
          onResponse: () => {},
          onSuccess: () => {
            toastSuccess(t("auth.signInSuccess"));
            router.dismissTo("/(tabs)/(home)");
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
    <View className="gap-4">
      <passwordForm.Field
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
              <View className="mt-1 min-h-4">
                <Text className={`text-xs ${isInvalid ? "text-danger" : "text-transparent"}`}>
                  {isInvalid ? errorMessage : " "}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <passwordForm.Field
        name="password"
        children={(field) => {
          const errorMessage = getErrorMessage(field.state.meta.errors);
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid && Boolean(errorMessage);

          return (
            <View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-base font-medium text-foreground">{t("auth.password")}</Text>
                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable>
                    <Text className="text-base font-medium text-link">
                      {t("auth.forgotPassword")}
                    </Text>
                  </Pressable>
                </Link>
              </View>

              <View className="h-12 flex-row items-center rounded-lg border border-field-border bg-field px-4">
                <View className="flex-1">
                  <TextInput
                    className="flex-1 text-base leading-tight text-field-foreground"
                    id={field.name}
                    placeholder={t("auth.passwordPlaceholder")}
                    placeholderTextColor={fieldPlaceholderColor}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    cursorColor={accentColor}
                    selectionColor={accentColor}
                    textContentType="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={field.handleChange}
                  />
                </View>
                <Pressable onPress={() => setShowPassword(!showPassword)} className="ml-3">
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={18}
                    color={mutedColor}
                  />
                </Pressable>
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

      <passwordForm.Subscribe>
        {(state) => (
          <Button
            variant="primary"
            feedbackVariant="scale-ripple"
            onPress={() => passwordForm.handleSubmit()}
            isDisabled={!state.canSubmit || state.isSubmitting}
            className={`h-12 items-center justify-center rounded-md ${
              !state.canSubmit || state.isSubmitting ? "opacity-60" : ""
            }`}
          >
            {state.isSubmitting ? (
              <View className="flex-row items-center">
                <Spinner size="sm" className="mr-2 text-accent-foreground" />
                <Text className="text-xl font-semibold text-accent-foreground">
                  {t("auth.signingIn")}
                </Text>
              </View>
            ) : (
              <Text className="text-xl font-semibold text-accent-foreground">
                {t("auth.logIn")}
              </Text>
            )}
          </Button>
        )}
      </passwordForm.Subscribe>
    </View>
  );
}
