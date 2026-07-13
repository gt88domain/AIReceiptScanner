import { resolvePaymentPresentation } from "@repo/app-config/membership";
import type { PurchasesOfferings } from "react-native-purchases";
import type { useTranslation } from "react-i18next";
import { nativePayments } from "@/lib/payments/revenuecat";
import type { PlanOption } from "./types";

type TranslateFunction = ReturnType<typeof useTranslation>["t"];

export function resolveNativePresentationText(
  t: TranslateFunction,
  presentation: ReturnType<typeof resolvePaymentPresentation>,
) {
  return {
    title:
      presentation.titleKey === "monthly"
        ? t("pricing.frequencies.monthly")
        : presentation.titleKey === "yearly"
          ? t("pricing.frequencies.yearly")
          : t("pricing.frequencies.lifetime"),
    billingNote:
      presentation.billingNoteKey === "flexible_cancel_anytime"
        ? t("pricing.billingNote.flexibleCancelAnytime")
        : presentation.billingNoteKey === "billed_annually"
          ? t("pricing.billingNote.billedAnnually")
          : t("pricing.billingNote.oneTimePurchase"),
    suffix:
      presentation.suffixKey === "per_month"
        ? t("pricing.periods.perMonth")
        : presentation.suffixKey === "per_year"
          ? t("pricing.periods.perYear")
          : null,
    badge: presentation.badgeKey === "best_value" ? t("pricing.badge.bestValue") : null,
  };
}

export function buildPlanOptions(
  offerings: PurchasesOfferings | null,
  t: TranslateFunction,
): PlanOption[] {
  const config = nativePayments.getConfig();
  const options: PlanOption[] = [];

  for (const plan of config.plans) {
    if (plan.status !== "active") {
      continue;
    }

    for (const price of plan.prices) {
      if (price.status !== "active") {
        continue;
      }

      const rcPackage = nativePayments.getPackageByPlanPrice({
        offerings,
        planId: plan.id,
        priceId: price.id,
      });

      if (!rcPackage?.product.priceString) {
        continue;
      }

      const presentation = resolvePaymentPresentation({
        priceType: price.priceType,
        interval: price.interval,
      });

      const localizedPresentation = resolveNativePresentationText(t, presentation);

      options.push({
        key: `${plan.id}:${price.id}`,
        planId: plan.id,
        priceId: price.id,
        priceType: price.priceType,
        interval: price.interval,
        title: localizedPresentation.title,
        billingNote: localizedPresentation.billingNote,
        price: rcPackage.product.priceString,
        ...(localizedPresentation.suffix ? { suffix: localizedPresentation.suffix } : {}),
        ...(localizedPresentation.badge ? { badge: localizedPresentation.badge } : {}),
      });
    }
  }

  return options;
}

export function getDefaultPlanKey<T extends Pick<PlanOption, "key" | "badge">>(options: T[]) {
  return options.find((option) => option.badge)?.key ?? options[0]?.key ?? null;
}

export function getSelectedPlan<T extends Pick<PlanOption, "key">>(
  options: T[],
  selectedPlanKey: string | null,
) {
  if (!selectedPlanKey) {
    return options[0] ?? null;
  }

  return options.find((option) => option.key === selectedPlanKey) ?? options[0] ?? null;
}

export function resolveMembershipLabel(
  t: TranslateFunction,
  tier: "free" | "monthly" | "yearly" | "lifetime",
) {
  switch (tier) {
    case "monthly":
      return t("pricing.frequencies.monthly");
    case "yearly":
      return t("pricing.frequencies.yearly");
    case "lifetime":
      return t("pricing.frequencies.lifetime");
    default:
      return t("pricing.freeLabel");
  }
}

export function resolvePurchaseButtonLabel(
  t: TranslateFunction,
  decision: { reason: string } | null,
  selectedPlan: PlanOption | null,
) {
  if (!decision) {
    return t("premium.actions.startTrialAndSubscribe");
  }

  if (decision.reason === "current_price") {
    return t("premium.actions.currentPlan");
  }
  if (decision.reason === "downgrade_or_same_tier") {
    return t("premium.actions.downgradeNotAllowed");
  }
  if (decision.reason === "already_lifetime") {
    return t("premium.actions.alreadyLifetime");
  }
  if (decision.reason === "subscription_upgrade") {
    return t("premium.actions.upgradePlan");
  }

  if (selectedPlan?.priceType === "lifetime") {
    return t("premium.actions.unlockLifetime");
  }

  return t("premium.actions.startTrialAndSubscribe");
}
