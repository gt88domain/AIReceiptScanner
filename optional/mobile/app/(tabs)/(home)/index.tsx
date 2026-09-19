import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useAuth } from "@/providers/auth-provider";

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [accentColor, mutedColor] = useThemeColor(["accent", "muted"]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
    >
      <View className="pt-8">
        <Text className="text-sm font-semibold uppercase tracking-wider text-muted">
          {appConfig.appName}
        </Text>
        <Text className="mt-2 text-3xl font-bold text-foreground">
          {isAuthenticated && user?.name
            ? t("home.welcomeNamed", { name: user.name })
            : t("home.welcome")}
        </Text>
        <Text className="mt-2 text-base leading-6 text-muted">{t("home.description")}</Text>
      </View>

      <View className="mt-8 gap-4">
        <View className="rounded-3xl border border-border bg-surface p-5">
          <View className="size-11 items-center justify-center rounded-2xl bg-accent/10">
            <MaterialIcons name="document-scanner" size={24} color={accentColor} />
          </View>
          <Text className="mt-4 text-xl font-bold">{t("home.scanTitle")}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">{t("home.scanDescription")}</Text>
          <Button
            className="mt-5 h-11 items-center justify-center"
            onPress={() => router.push("/(tabs)/(home)/scan")}
          >
            <Button.Label className="font-bold">{t("home.scanAction")}</Button.Label>
          </Button>
        </View>

        <View className="rounded-3xl border border-border bg-surface p-5">
          <View className="size-11 items-center justify-center rounded-2xl bg-accent/10">
            <MaterialIcons name="stars" size={24} color={accentColor} />
          </View>
          <Text className="mt-4 text-xl font-bold">{t("home.membershipTitle")}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">
            {t("home.membershipDescription")}
          </Text>
          <Button
            className="mt-5 h-11 items-center justify-center"
            onPress={() =>
              router.push(isAuthenticated ? "/(tabs)/(profile)/premium" : "/(auth)/sign-in")
            }
          >
            <Button.Label className="font-bold">{t("home.membershipAction")}</Button.Label>
          </Button>
        </View>

        <View className="rounded-3xl border border-border bg-surface p-5">
          <View className="size-11 items-center justify-center rounded-2xl bg-surface-secondary">
            <MaterialIcons name="person-outline" size={24} color={mutedColor} />
          </View>
          <Text className="mt-4 text-xl font-bold">{t("home.profileTitle")}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">{t("home.profileDescription")}</Text>
          <Button
            variant="secondary"
            className="mt-5 h-11 items-center justify-center"
            onPress={() => router.push("/(tabs)/(profile)")}
          >
            <Button.Label className="font-bold">{t("home.profileAction")}</Button.Label>
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
