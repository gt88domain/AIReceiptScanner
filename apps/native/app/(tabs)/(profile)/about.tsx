import { MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { ListGroup, Separator, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { Linking, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useTabBarVisibility } from "@/providers/tab-bar-provider";

interface AboutItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description?: string;
  onPress?: () => void;
}

function AboutItem({ icon, title, description, onPress }: AboutItemProps) {
  const [mutedColor] = useThemeColor(["muted"]);

  return (
    <ListGroup.Item onPress={onPress}>
      <ListGroup.ItemPrefix>
        <MaterialIcons name={icon} size={20} color={mutedColor} />
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
        {description ? <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription> : null}
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix />
    </ListGroup.Item>
  );
}

export default function AboutScreen() {
  const { t } = useTranslation();
  useTabBarVisibility(true);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: appConfig.safeAreaBottom }}
    >
      <View className="items-center pb-6 pt-10">
        <View className="mb-3 size-20 items-center justify-center overflow-hidden rounded-2xl">
          <Image
            source={require("@/assets/logo/logo.png")}
            style={{ width: 80, height: 80 }}
            contentFit="cover"
          />
        </View>
        <Text className="text-xl font-bold text-foreground">{appConfig.appName}</Text>
        <Text className="mt-1 text-sm text-muted">v{appVersion}</Text>
      </View>

      <View className="px-6">
        <ListGroup>
          <AboutItem
            icon="email"
            title={t("settings.technicalSupport")}
            description={appConfig.supportEmail}
            onPress={() => {
              Linking.openURL(`mailto:${appConfig.supportEmail}`);
            }}
          />
          <Separator className="mx-4 bg-separator/30" />
          <AboutItem
            icon="language"
            title={t("settings.officialWebsite")}
            description={appConfig.websiteUrl.replace("https://", "")}
            onPress={() => {
              Linking.openURL(appConfig.websiteUrl);
            }}
          />
          <Separator className="mx-4 bg-separator/30" />
          <AboutItem
            icon="group"
            title={t("settings.followUs")}
            description="X (Twitter)"
            onPress={() => {
              Linking.openURL(appConfig.socialUrl);
            }}
          />
        </ListGroup>

        <Text className="mt-8 text-center text-xs text-muted">{t("settings.madeWithCare")}</Text>
      </View>
    </ScrollView>
  );
}
