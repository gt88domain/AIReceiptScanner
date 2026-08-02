import { MaterialIcons } from "@expo/vector-icons";
import { resolveNativeCommonConfig } from "@repo/app-config";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { ListGroup, Separator, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useTabBarVisibility } from "@/providers/tab-bar-provider";

const nativeRoutes = resolveNativeCommonConfig().routes;
const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL;

interface PolicyItemProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  href: string;
}

function PolicyItem({ icon, title, href }: PolicyItemProps) {
  const [mutedColor] = useThemeColor(["muted"]);

  return (
    <ListGroup.Item
      onPress={() => {
        openBrowserAsync(href, {
          presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
        });
      }}
    >
      <ListGroup.ItemPrefix>
        <MaterialIcons name={icon} size={20} color={mutedColor} />
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix />
    </ListGroup.Item>
  );
}

export default function PrivacyScreen() {
  const { t } = useTranslation();
  useTabBarVisibility(true);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: appConfig.safeAreaBottom }}
    >
      <View className="px-6 pt-8">
        <Text className="mb-6 text-sm leading-5 text-muted">
          {t("settings.privacyDescription")}
        </Text>

        <ListGroup>
          <PolicyItem
            icon="privacy-tip"
            title={t("settings.privacyPolicy")}
            href={webAppUrl + nativeRoutes.privacyPolicy}
          />
          <Separator className="mx-4 bg-separator/30" />
          <PolicyItem
            icon="description"
            title={t("settings.termsOfService")}
            href={webAppUrl + nativeRoutes.termsOfService}
          />
        </ListGroup>
      </View>
    </ScrollView>
  );
}
