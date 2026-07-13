import { useTranslation } from "react-i18next";
import Animated, { FadeInUp } from "react-native-reanimated";
import { EmptyPlansState } from "@/components/premium/empty-plans-state";
import { FooterLinks } from "@/components/premium/footer-links";
import { PlanCard } from "@/components/premium/plan-card";
import { PurchaseSection } from "@/components/premium/purchase-section";
import type { PlanOption, ResolvedPlanOption } from "@/components/premium/types";
import { resolvePurchaseButtonLabel } from "@/components/premium/utils";

type PremiumActionsProps = {
  canPurchase: boolean;
  isBusy: boolean;
  isMembershipSyncing: boolean;
  onPurchase: (plan: PlanOption) => void;
  onRestore: () => void;
  planOptions: ResolvedPlanOption[];
  selectedPlan: ResolvedPlanOption | null;
  selectedPlanKey: string | null;
  setSelectedPlanKey: (key: string) => void;
};

export function PremiumActions({
  canPurchase,
  isBusy,
  isMembershipSyncing,
  onPurchase,
  onRestore,
  planOptions,
  selectedPlan,
  selectedPlanKey,
  setSelectedPlanKey,
}: PremiumActionsProps) {
  const { t } = useTranslation();

  if (!canPurchase) {
    return <FooterLinks isBusy={false} />;
  }

  if (planOptions.length === 0) {
    return <EmptyPlansState />;
  }

  const purchaseAction =
    selectedPlan && selectedPlan.decision.action !== "disabled"
      ? () => onPurchase(selectedPlan)
      : undefined;

  return (
    <>
      <Animated.View className="mt-10 gap-3" entering={FadeInUp.delay(170).duration(420)}>
        {planOptions.map((plan) => {
          return (
            <PlanCard
              key={plan.key}
              isCurrent={plan.isCurrent}
              isDisabled={plan.decision.action === "disabled"}
              isSelected={selectedPlanKey === plan.key}
              title={plan.title}
              billingNote={plan.billingNote}
              price={plan.price}
              suffix={plan.suffix}
              badge={plan.badge}
              onPress={() => setSelectedPlanKey(plan.key)}
            />
          );
        })}
      </Animated.View>

      <PurchaseSection
        isBusy={isBusy}
        isMembershipSyncing={isMembershipSyncing}
        onPurchase={purchaseAction}
        onRestore={onRestore}
        purchaseButtonLabel={resolvePurchaseButtonLabel(
          t,
          selectedPlan?.decision ?? null,
          selectedPlan,
        )}
        purchaseNote={
          selectedPlan?.priceType === "lifetime"
            ? t("premium.actions.lifetimeNote")
            : selectedPlan?.decision.reason === "subscription_upgrade"
              ? t("premium.actions.upgradeNote")
              : t("premium.actions.subscriptionNote")
        }
        selectedPlan={selectedPlan}
      />
    </>
  );
}
