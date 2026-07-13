// https://github.com/expo/skills/blob/main/plugins/expo/skills/building-native-ui/references/tabs.md

import { Link, Stack } from "expo-router";
import { useThemeColor } from "heroui-native";
import { ReceiptText } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { appConfig } from "@/configs/app-config";

/** Stack navigator for profile-related native screens. */
export default function HomeStack() {
  const { t } = useTranslation();
  const [backgroundColor, foregroundColor] = useThemeColor(["background", "foreground"]);

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor },
        headerStyle: { backgroundColor },
        headerTintColor: foregroundColor,
        headerLargeTitleStyle: { color: foregroundColor },
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerLargeStyle: { backgroundColor },
        headerLargeTitleEnabled: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t("tabs.profile"),
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          title: t("profile.editProfile"),
        }}
      />
      <Stack.Screen
        name="language"
        options={{
          title: t("settings.language"),
        }}
      />
      <Stack.Screen name="security" options={{ title: t("settings.security") }} />
      <Stack.Screen name="theme" options={{ title: t("settings.theme") }} />
      <Stack.Screen name="premium" options={{ title: t("premium.title") }} />
      {appConfig.creditsEnabled ? (
        <Stack.Screen
          name="credits"
          options={{
            title: t("credits.title"),
            headerRight: () => (
              <Link href="/(tabs)/(profile)/credits-transactions" asChild>
                <Pressable
                  accessibilityLabel={t("credits.transactionsPageTitle")}
                  accessibilityRole="button"
                  className="size-10 items-center justify-center"
                  hitSlop={10}
                >
                  <ReceiptText size={22} color={foregroundColor} />
                </Pressable>
              </Link>
            ),
          }}
        />
      ) : null}
      {appConfig.creditsEnabled ? (
        <Stack.Screen
          name="credits-transactions"
          options={{ title: t("credits.transactionsPageTitle") }}
        />
      ) : null}
      <Stack.Screen name="about" options={{ title: t("settings.about") }} />
      <Stack.Screen name="faq" options={{ title: t("settings.faq") }} />
      <Stack.Screen name="privacy" options={{ title: t("settings.privacyAndTerms") }} />
    </Stack>
  );
}
