import { Button, Spinner } from "heroui-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { FooterLinks } from "@/components/premium/footer-links";
import type { PlanOption } from "@/components/premium/types";
import { Text } from "@/components/ui/text";

export function PurchaseSection({
  isBusy,
  isMembershipSyncing,
  onPurchase,
  onRestore,
  purchaseButtonLabel,
  purchaseNote,
  selectedPlan,
}: {
  isBusy: boolean;
  isMembershipSyncing: boolean;
  onPurchase?: () => void;
  onRestore: () => void;
  purchaseButtonLabel: string;
  purchaseNote: string;
  selectedPlan: PlanOption | null;
}) {
  const { t } = useTranslation();

  return (
    <Animated.View entering={FadeInUp.delay(220).duration(420)}>
      <Button
        className="mt-4 h-12 items-center justify-center"
        feedbackVariant="scale-ripple"
        isDisabled={isBusy || !onPurchase}
        onPress={onPurchase}
      >
        {isBusy ? (
          <>
            <Spinner size="sm" className="text-primary-foreground" />
            <Button.Label className="text-base font-bold">
              {t("premium.actions.purchasing")}
            </Button.Label>
          </>
        ) : (
          <Button.Label className="text-base font-bold">{purchaseButtonLabel}</Button.Label>
        )}
      </Button>

      <Text className="mt-4 text-center text-sm leading-5 text-muted">{purchaseNote}</Text>

      {isMembershipSyncing && selectedPlan ? (
        <View className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-warning/10 px-4 py-3">
          <Spinner size="sm" className="text-warning" />
          <Text className="flex-1 text-sm leading-5 text-warning">
            {t("premium.actions.syncing")}
          </Text>
        </View>
      ) : null}

      <FooterLinks isBusy={isBusy} onRestore={onRestore} />
    </Animated.View>
  );
}
