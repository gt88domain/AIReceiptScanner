// https://github.com/expo/skills/blob/main/plugins/expo/skills/building-native-ui/references/tabs.md

import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";

export default function HomeStack() {
  const { t } = useTranslation();
  const [backgroundColor, foregroundColor] = useThemeColor(["background", "foreground"]);

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor },
        headerStyle: { backgroundColor },
        headerTintColor: foregroundColor,
        headerShadowVisible: false,
        headerLargeTitleStyle: { color: foregroundColor },
      }}
    >
      <Stack.Screen name="index" options={{ title: t("tabs.home"), headerLargeTitle: true }} />
      <Stack.Screen name="scan" options={{ title: t("receiptScan.title"), headerLargeTitle: false }} />
      <Stack.Screen name="verify" options={{ title: t("receiptVerify.title"), headerLargeTitle: false }} />
    </Stack>
  );
}
