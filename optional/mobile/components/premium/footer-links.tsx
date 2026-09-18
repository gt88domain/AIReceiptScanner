import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { resolveNativeCommonConfig } from "@repo/app-config";
import { ExternalLink } from "@/components/external-link";
import { Text } from "@/components/ui/text";

const nativeRoutes = resolveNativeCommonConfig().routes;
const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL;

export function FooterLinks({ isBusy, onRestore }: { isBusy: boolean; onRestore?: () => void }) {
  const { t } = useTranslation();

  return (
    <View className="mt-10 flex-row items-center justify-center gap-3">
      {onRestore ? (
        <>
          <Pressable onPress={onRestore} disabled={isBusy}>
            <Text className="text-sm text-muted">{t("premium.actions.restorePurchase")}</Text>
          </Pressable>
          <Text className="text-sm text-muted">&bull;</Text>
        </>
      ) : null}
      <ExternalLink href={webAppUrl + nativeRoutes.termsOfService}>
        <Text className="text-sm text-muted">{t("premium.actions.termsOfService")}</Text>
      </ExternalLink>
      <Text className="text-sm text-muted">&bull;</Text>
      <ExternalLink href={webAppUrl + nativeRoutes.privacyPolicy}>
        <Text className="text-sm text-muted">{t("premium.actions.privacyPolicy")}</Text>
      </ExternalLink>
    </View>
  );
}
