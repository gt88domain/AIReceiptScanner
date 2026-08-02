import { AntDesign } from "@expo/vector-icons";
import { Button } from "heroui-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Text } from "@/components/ui/text";

export function SubscribedBanner() {
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeInUp.duration(400)} className="mt-8 rounded-2xl bg-accent/10 p-5">
      <View className="flex-row items-center gap-3">
        <AntDesign name="check-circle" size={22} className="text-accent" />
        <Text className="flex-1 text-base font-bold">{t("premium.banner.subscribedTitle")}</Text>
      </View>
      <Text className="mt-2 text-sm leading-5 text-muted">
        {t("premium.banner.subscribedDescription")}
      </Text>
    </Animated.View>
  );
}

export function UnavailableBanner({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeInUp.duration(400)} className="mt-8 rounded-2xl bg-warning/10 p-5">
      <View className="flex-row items-center gap-3">
        <AntDesign name="warning" size={20} className="text-warning" />
        <Text className="flex-1 text-base font-bold">{t("premium.banner.unavailableTitle")}</Text>
      </View>
      <Text className="mt-2 text-sm leading-5 text-muted">
        {t("premium.banner.unavailableDescription")}
      </Text>
      {onRetry ? (
        <Button className="mt-3 h-10 self-start" variant="secondary" onPress={onRetry}>
          <Button.Label className="font-bold">{t("common.retry")}</Button.Label>
        </Button>
      ) : null}
    </Animated.View>
  );
}

export function MembershipStatusBanner({ label }: { label: string }) {
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeInUp.duration(400)} className="mt-8 rounded-2xl bg-accent/10 p-5">
      <View className="flex-row items-center gap-3">
        <AntDesign name="check-circle" size={22} className="text-accent" />
        <Text className="flex-1 text-base font-bold">
          {t("premium.banner.membershipTitle", { plan: label })}
        </Text>
      </View>
      <Text className="mt-2 text-sm leading-5 text-muted">
        {t("premium.banner.membershipDescription")}
      </Text>
    </Animated.View>
  );
}
