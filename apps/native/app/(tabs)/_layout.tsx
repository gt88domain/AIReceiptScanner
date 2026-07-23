import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { TabBarProvider, useTabBar } from "@/providers/tab-bar-provider";
import { useThemePreference } from "@/providers/theme-provider";

export default function TabLayout() {
  return (
    <TabBarProvider>
      <TabLayoutContent />
    </TabBarProvider>
  );
}

function TabLayoutContent() {
  const { t } = useTranslation();
  const { isTabBarHidden } = useTabBar();
  const { activeThemeName } = useThemePreference();
  const [surfaceColor, borderColor, mutedColor, accentColor] = useThemeColor([
    "surface",
    "border",
    "muted",
    "accent",
  ]);

  return (
    <NativeTabs
      key={activeThemeName}
      hidden={isTabBarHidden}
      backgroundColor={surfaceColor}
      iconColor={{ default: mutedColor, selected: accentColor }}
      labelStyle={{
        default: { color: mutedColor },
        selected: { color: accentColor },
      }}
      shadowColor={borderColor}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(profile)">
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
        <NativeTabs.Trigger.Label>{t("tabs.profile")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
