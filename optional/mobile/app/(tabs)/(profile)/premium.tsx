import { useThemeColor } from "heroui-native";
import { resolveCheckoutPolicyDecision } from "@repo/app-config/membership";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import Animated, { FadeIn, FadeInUp, FadeOut } from "react-native-reanimated";
import { FeatureRow } from "@/components/premium/feature-row";
import { PremiumActions } from "@/components/premium/premium-actions";
import { PremiumScreenSkeleton } from "@/components/premium/premium-screen-skeleton";
import { MembershipStatusBanner, UnavailableBanner } from "@/components/premium/status-banners";
import type { PlanOption, ResolvedPlanOption } from "@/components/premium/types";
import {
  buildPlanOptions,
  getDefaultPlanKey,
  getSelectedPlan,
  resolveMembershipLabel,
} from "@/components/premium/utils";
import { FullScreenHud } from "@/components/ui/full-screen-hud";
import { Text } from "@/components/ui/text";
import { useNativePayments } from "@/hooks/use-native-payments";
import { toStringArray } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTabBarVisibility } from "@/providers/tab-bar-provider";

type PurchasePhase = "confirming" | "processing" | "syncing" | null;

const HUD_CONTENT_BY_PHASE = {
  confirming: {
    titleKey: "premium.hud.title",
    descriptionKey: "premium.hud.description",
  },
  processing: {
    titleKey: "premium.hud.processingTitle",
    descriptionKey: "premium.hud.processingDescription",
  },
  syncing: {
    titleKey: "premium.hud.syncingTitle",
    descriptionKey: "premium.hud.syncingDescription",
  },
} as const;

function shouldFreezeBillingSnapshot(purchasePhase: PurchasePhase) {
  return purchasePhase === "confirming" || purchasePhase === "processing";
}

export default function PremiumScreen() {
  const { t } = useTranslation();
  const { toastSuccess, toastError } = useToast();
  const payments = useNativePayments();
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  const [purchasePhase, setPurchasePhase] = useState<PurchasePhase>(null);
  const [backgroundColor] = useThemeColor(["background"]);

  // Freeze the rendered billing snapshot only while the store purchase is still
  // in flight. Once the app enters syncing, the latest entitlement should be
  // allowed to render immediately.
  const [displayBillingSnapshot, setDisplayBillingSnapshot] = useState(() => ({
    currentEntitlement: {
      tier: payments.currentEntitlement.tier,
      source: payments.currentEntitlement.source,
      planId: payments.currentEntitlement.planId,
      priceId: payments.currentEntitlement.priceId,
    },
    activePriceId: payments.activePrice?.id ?? null,
  }));

  const isPurchaseFlowActive = shouldFreezeBillingSnapshot(purchasePhase);

  const displayCurrentEntitlement = isPurchaseFlowActive
    ? displayBillingSnapshot.currentEntitlement
    : payments.currentEntitlement;

  const displayActivePriceId = isPurchaseFlowActive
    ? displayBillingSnapshot.activePriceId
    : (payments.activePrice?.id ?? null);

  const entitlementSelectionKey = `${displayCurrentEntitlement.tier}:${displayCurrentEntitlement.source}:${displayActivePriceId ?? ""}`;
  const prevEntitlementSelectionKeyRef = useRef(entitlementSelectionKey);

  useTabBarVisibility(true);

  useEffect(() => {
    if (purchasePhase !== null) {
      return;
    }

    setDisplayBillingSnapshot({
      currentEntitlement: {
        tier: payments.currentEntitlement.tier,
        source: payments.currentEntitlement.source,
        planId: payments.currentEntitlement.planId,
        priceId: payments.currentEntitlement.priceId,
      },
      activePriceId: payments.activePrice?.id ?? null,
    });
  }, [
    purchasePhase,
    payments.currentEntitlement.planId,
    payments.currentEntitlement.priceId,
    payments.currentEntitlement.source,
    payments.currentEntitlement.tier,
    payments.activePrice?.id,
  ]);

  // The syncing phase ends only after local and server membership state reconcile.
  useEffect(() => {
    if (purchasePhase === "syncing" && !payments.isMembershipSyncing) {
      setPurchasePhase(null);
      toastSuccess(t("premium.feedback.welcome"));
    }
  }, [purchasePhase, payments.isMembershipSyncing, toastSuccess, t]);

  const planOptions = useMemo(() => {
    if (!payments.isAvailable) {
      return [];
    }

    return buildPlanOptions(payments.offerings, t);
  }, [payments.isAvailable, payments.offerings, t]);

  const resolvedPlanOptions = useMemo<ResolvedPlanOption[]>(
    () =>
      planOptions.map((plan) => {
        // Resolve checkout policy once per card so recommendation, selection, and
        // rendering all use the same decision source.
        const decision = resolveCheckoutPolicyDecision(
          {
            currentEntitlement: {
              tier: displayCurrentEntitlement.tier,
              source: displayCurrentEntitlement.source,
            },
            activePrice: displayActivePriceId ? { id: displayActivePriceId } : null,
          },
          {
            id: plan.priceId,
            priceType: plan.priceType,
            interval: plan.interval,
          },
        );

        return {
          ...plan,
          decision,
          isCurrent: decision.reason === "current_price",
        };
      }),
    [
      planOptions,
      displayCurrentEntitlement.source,
      displayCurrentEntitlement.tier,
      displayActivePriceId,
    ],
  );

  const recommendedPlanKey = useMemo(
    () =>
      resolvedPlanOptions.find((plan) => plan.decision.action !== "disabled")?.key ??
      getDefaultPlanKey(resolvedPlanOptions),
    [resolvedPlanOptions],
  );

  useEffect(() => {
    const entitlementChanged = prevEntitlementSelectionKeyRef.current !== entitlementSelectionKey;
    prevEntitlementSelectionKeyRef.current = entitlementSelectionKey;

    setSelectedPlanKey((currentKey) => {
      if (entitlementChanged) {
        return recommendedPlanKey;
      }

      if (currentKey && resolvedPlanOptions.some((plan) => plan.key === currentKey)) {
        return currentKey;
      }

      return recommendedPlanKey;
    });
  }, [entitlementSelectionKey, recommendedPlanKey, resolvedPlanOptions]);

  const selectedPlan = useMemo(
    () => getSelectedPlan(resolvedPlanOptions, selectedPlanKey),
    [resolvedPlanOptions, selectedPlanKey],
  );

  const featureLabels = toStringArray(t("pricing.plans.pro.features", { returnObjects: true }));
  const hasEntitlement = displayCurrentEntitlement.source !== "none";
  const isLifetime = displayCurrentEntitlement.tier === "lifetime";
  const hasUpgradeOptions = hasEntitlement && !isLifetime;
  const currentMembershipLabel = resolveMembershipLabel(t, displayCurrentEntitlement.tier);

  const canPurchase = payments.isAvailable;

  const handlePurchase = useCallback(
    async (plan: PlanOption) => {
      setPurchasePhase("confirming");

      try {
        setPurchasePhase("processing");
        const result = await payments.purchase(plan.planId, plan.priceId);

        if (result.status === "cancelled") {
          toastError(t("premium.feedback.purchaseCancelled"));
          setPurchasePhase(null);
          return;
        }

        setPurchasePhase("syncing");
      } catch {
        toastError(t("premium.feedback.purchaseFailed"));
        setPurchasePhase(null);
      }
    },
    [payments, t, toastError],
  );

  const handleRestore = useCallback(async () => {
    try {
      await payments.restore();
      toastSuccess(t("premium.actions.syncing"));
    } catch {
      toastError(t("premium.feedback.restoreFailed"));
    }
  }, [payments, t, toastError, toastSuccess]);

  const hudContent = HUD_CONTENT_BY_PHASE[purchasePhase ?? "confirming"];
  const hudTitle = t(hudContent.titleKey);
  const hudDescription = t(hudContent.descriptionKey);

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 24,
          backgroundColor,
        }}
      >
        {payments.isLoading ? (
          <Animated.View key="skeleton" exiting={FadeOut.duration(300)}>
            <PremiumScreenSkeleton
              backgroundColor={backgroundColor}
              features={featureLabels}
              inline
            />
          </Animated.View>
        ) : (
          <Animated.View key="content" entering={FadeIn.duration(400)} className="px-0 pb-10 pt-2">
            <Animated.View entering={FadeInUp.duration(400)}>
              <Text className="text-2xl font-bold">{t("premium.title")}</Text>
              <Text className="mt-1 text-base leading-6 text-muted">{t("premium.subtitle")}</Text>
            </Animated.View>

            {!hasEntitlement && !canPurchase ? (
              <UnavailableBanner onRetry={payments.error ? () => void payments.retry() : undefined} />
            ) : null}

            {hasEntitlement ? <MembershipStatusBanner label={currentMembershipLabel} /> : null}

            {!hasEntitlement || hasUpgradeOptions ? (
              <>
                <Animated.View className="mt-8 gap-4" entering={FadeInUp.delay(120).duration(420)}>
                  {featureLabels.map((feature: string) => (
                    <FeatureRow key={feature} label={feature} />
                  ))}
                </Animated.View>

                <PremiumActions
                  canPurchase={canPurchase}
                  isBusy={payments.isPurchasing}
                  isMembershipSyncing={payments.isMembershipSyncing}
                  onPurchase={handlePurchase}
                  onRestore={handleRestore}
                  planOptions={resolvedPlanOptions}
                  selectedPlan={selectedPlan}
                  selectedPlanKey={selectedPlanKey}
                  setSelectedPlanKey={setSelectedPlanKey}
                />
              </>
            ) : null}
          </Animated.View>
        )}
      </ScrollView>

      <FullScreenHud
        visible={purchasePhase !== null}
        title={hudTitle}
        description={hudDescription}
      />
    </>
  );
}
