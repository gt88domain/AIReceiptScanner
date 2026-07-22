import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { getAuthConfig } from "@/configs/app-config";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/auth.client";
import { orpc } from "@/lib/orpc";
import { useAuth } from "@/providers/auth-provider";
import { useTabBarVisibility } from "@/providers/tab-bar-provider";
import { getVisibleUserEmail, isPhoneUser } from "@repo/shared";

function formatProviderName(provider: "github" | "google", t: (key: string) => string) {
  return t(`auth.providers.${provider}`);
}

export default function SecurityScreen() {
  const { t } = useTranslation();
  const { toastError, toastSuccess } = useToast();
  const { user } = useAuth();
  if (!user) {
    return null;
  }

  const [successColor, mutedColor] = useThemeColor(["success", "muted"]);
  const [isSending, setIsSending] = useState(false);
  const passwordStatus = useQuery(orpc.users.getPasswordStatus.queryOptions());

  useTabBarVisibility(true);

  const visibleEmail = getVisibleUserEmail(user);
  const visiblePhoneNumber = user.phoneNumber ?? null;
  const hasPassword = passwordStatus.data?.hasPassword ?? false;
  const socialProviders = passwordStatus.data?.socialProviders ?? [];
  const isLoading = passwordStatus.isLoading;
  const isError = passwordStatus.isError;
  const isSocialUser = !isLoading && !isError && !hasPassword && socialProviders.length > 0;
  const isPasswordUser = !isLoading && !isError && hasPassword;
  const hasPhoneLogin = isPhoneUser(user);
  const providerNames = socialProviders
    .map((provider) => formatProviderName(provider, t))
    .join(" / ");

  async function handleSendReset() {
    setIsSending(true);

    try {
      await authClient.requestPasswordReset(
        {
          email: visibleEmail ?? "",
          redirectTo: getAuthConfig().resetPasswordURL,
        },
        {
          onSuccess: () => {
            toastSuccess(t("security.password.resetSent"));
          },
          onError: (error) => {
            toastError(error.error.message || error.error.statusText);
          },
        },
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View className="gap-6 px-6 py-8">
        <View className="gap-2">
          <Text className="text-sm text-muted">
            {isSocialUser ? t("security.socialDescription") : t("security.description")}
          </Text>
        </View>

        {isLoading ? (
          <View className="items-center gap-3 rounded-2xl bg-surface p-6">
            <Spinner />
            <Text className="text-sm text-muted">{t("security.loading")}</Text>
          </View>
        ) : isError ? (
          <View className="rounded-2xl bg-surface p-6">
            <Text className="text-sm text-danger">{t("security.statusError")}</Text>
          </View>
        ) : isSocialUser ? (
          <View className="gap-4 rounded-2xl bg-surface p-6">
            <View className="flex-row items-center gap-3">
              <MaterialIcons name="verified-user" size={20} color={successColor} />
              <View className="flex-1 gap-1">
                <Text className="text-base font-semibold text-foreground">
                  {providerNames} {t("security.loginMethods.socialLogin")}
                </Text>
                <Text className="text-sm text-muted">
                  {t("security.loginMethods.socialLoginActive")}
                </Text>
              </View>
              <Text className="text-sm font-medium" style={{ color: successColor }}>
                {t("security.loginMethods.active")}
              </Text>
            </View>

            <View className="gap-2 rounded-xl bg-background px-4 py-4">
              <Text className="text-sm font-semibold text-foreground">
                {t("security.socialAccount.title")}
              </Text>
              <Text className="text-sm text-muted">
                {t("security.socialAccount.description", { providers: providerNames })}
              </Text>
              <Text className="text-sm text-muted">
                {t("security.socialLoginSecurity", { providers: providerNames })}
              </Text>
            </View>
          </View>
        ) : hasPhoneLogin ? (
          <View className="gap-4 rounded-2xl bg-surface p-6">
            <View className="flex-row items-center gap-3">
              <MaterialIcons name="verified-user" size={20} color={successColor} />
              <View className="flex-1 gap-1">
                <Text className="text-base font-semibold text-foreground">
                  {t("security.phone.title")}
                </Text>
                <Text className="text-sm text-muted">
                  {t("security.phone.verifiedNumber", { phoneNumber: visiblePhoneNumber ?? "" })}
                </Text>
              </View>
              <Text className="text-sm font-medium" style={{ color: successColor }}>
                {t("security.phone.verified")}
              </Text>
            </View>

            <View className="gap-2 rounded-xl bg-background px-4 py-4">
              <Text className="text-sm font-semibold text-foreground">
                {isPasswordUser
                  ? t("security.phone.passwordEnabledTitle")
                  : t("security.phone.otpOnlyTitle")}
              </Text>
              <Text className="text-sm text-muted">
                {isPasswordUser
                  ? t("security.phone.passwordEnabledDescription")
                  : t("security.phone.otpOnlyDescription")}
              </Text>
            </View>
          </View>
        ) : isPasswordUser && visibleEmail ? (
          <View className="gap-4 rounded-2xl bg-surface p-6">
            <View className="gap-1">
              <Text className="text-base font-semibold text-foreground">
                {t("security.password.title")}
              </Text>
              <Text className="text-sm text-muted">{t("security.password.description")}</Text>
            </View>

            <View className="flex-row items-start gap-3 rounded-xl bg-background px-4 py-4">
              <MaterialIcons name="lock-outline" size={20} color={mutedColor} />
              <Text className="flex-1 text-sm text-muted">
                {t("security.password.hasPassword")}
              </Text>
            </View>

            <Button
              variant="primary"
              feedbackVariant="scale-ripple"
              onPress={handleSendReset}
              isDisabled={isSending}
              className={`h-12 items-center justify-center rounded-md ${isSending ? "opacity-60" : ""}`}
            >
              {isSending ? (
                <View className="flex-row items-center">
                  <Spinner size="sm" className="mr-2 text-accent-foreground" />
                  <Text className="text-base font-semibold text-accent-foreground">
                    {t("security.password.sendingReset")}
                  </Text>
                </View>
              ) : (
                <Text className="text-base font-semibold text-accent-foreground">
                  {t("security.password.sendReset")}
                </Text>
              )}
            </Button>
          </View>
        ) : (
          <View className="rounded-2xl bg-surface p-6">
            <Text className="text-sm text-muted">{t("security.description")}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
