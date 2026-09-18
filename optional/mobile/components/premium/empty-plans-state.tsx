import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { FooterLinks } from "@/components/premium/footer-links";
import { Text } from "@/components/ui/text";

export function EmptyPlansState() {
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeInUp.delay(220).duration(420)} className="mt-10">
      <View className="rounded-2xl border border-border bg-surface-secondary/40 p-5">
        <Text className="text-base font-bold">{t("premium.empty.title")}</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">{t("premium.empty.description")}</Text>
      </View>

      <FooterLinks isBusy={false} />
    </Animated.View>
  );
}
