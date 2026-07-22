import { useMutation } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { toast } from "sonner";
import { getBillingUrls } from "@/configs/web-config";
import { useBillingStatusQuery, usePaymentPlansQuery } from "@/hooks/use-payments";
import { useOrpc } from "@/hooks/use-orpc";
import { useTranslations } from "@/i18n";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authClient } from "@/lib/auth/auth-client";
import { resolveCheckoutPolicyDecision } from "@repo/app-config/membership";
import { createCheckoutSuccessUrl } from "@/lib/payments/checkout-redirect-url";
import { resolveBillingErrorMessage } from "@/lib/payments/error-message";
import { findPriceProvider } from "@/lib/payments/find-price-provider";
import { openProviderCheckoutUrl } from "@/lib/payments/open-checkout-url";
import { Section, SectionHeader } from "../section/section";
import { PricingMatrix } from "./pricing-matrix";
import { PricingSkeletonGrid } from "./pricing-skeleton-grid";
import type { PriceMeta } from "./pricing-types";

type PricingMatrixProps = ComponentProps<typeof PricingMatrix>;
type PricingMatrixIsCtaDisabled = NonNullable<PricingMatrixProps["isCtaDisabled"]>;

interface PricingSectionProps {
  title?: string;
  subtitle?: string;
}

export function PricingSection({ title, subtitle }: PricingSectionProps) {
  const orpc = useOrpc();
  const t = useTranslations("landingPage.pricing");
  const tBilling = useTranslations("dashboard.billing");
  const plansQuery = usePaymentPlansQuery();
  const plans = plansQuery.data ?? [];
  const { data: session } = authClient.useSession();
  const statusQuery = useBillingStatusQuery({ enabled: Boolean(session) });
  const billingUrls = getBillingUrls();
  const resolvedTitle = title ?? t("title");
  const resolvedSubtitle = subtitle ?? t("subtitle");

  const createCheckout = useMutation({
    ...orpc.web.payments.createCheckoutSession.mutationOptions(),
    onSuccess: ({ url }) => {
      openProviderCheckoutUrl(url);
    },
    onError: (error: Error) => {
      toast.error(resolveBillingErrorMessage(error, tBilling, "checkoutError"));
    },
  });

  const upgradeSubscription = useMutation({
    ...orpc.web.payments.upgradeSubscription.mutationOptions(),
    onSuccess: async () => {
      await statusQuery.refetch();
      toast.success(tBilling("upgradeSuccess"));
    },
    onError: (error: Error) => {
      toast.error(resolveBillingErrorMessage(error, tBilling, "upgradeError"));
    },
  });

  const ctaPending = createCheckout.isPending || upgradeSubscription.isPending;

  const getCheckoutDecision = (priceMeta: PriceMeta) =>
    resolveCheckoutPolicyDecision(statusQuery.data, {
      id: priceMeta.priceId,
      priceType: priceMeta.priceType,
      interval: priceMeta.interval,
    });

  const handleSelectPrice: PricingMatrixProps["onSelectPrice"] = session
    ? ({ planId, priceMeta }) => {
        const decision = getCheckoutDecision(priceMeta);
        const targetProvider = findPriceProvider(plans, priceMeta.priceId);
        const billingProvider = statusQuery.data?.billingProvider ?? null;
        const canUseDirectProviderUpgrade =
          decision.action === "upgrade" &&
          (billingProvider === "stripe" || billingProvider === "creem") &&
          targetProvider === billingProvider;

        if (canUseDirectProviderUpgrade) {
          upgradeSubscription.mutate({
            planId,
            priceId: priceMeta.priceId,
          });
          return;
        }
        if (decision.action !== "checkout" && decision.action !== "upgrade") {
          return;
        }

        createCheckout.mutate({
          planId,
          priceId: priceMeta.priceId,
          successUrl: createCheckoutSuccessUrl(billingUrls.successURL, {
            planId,
            priceId: priceMeta.priceId,
          }),
          cancelUrl: billingUrls.cancelURL,
        });
      }
    : undefined;

  const getCtaLabel: PricingMatrixProps["getCtaLabel"] = session
    ? ({ priceMeta }) => {
        if (!priceMeta) {
          return t("cta.getStarted");
        }
        if (statusQuery.isLoading) {
          return tBilling("startCheckout");
        }

        const decision = getCheckoutDecision(priceMeta);
        const targetProvider = findPriceProvider(plans, priceMeta.priceId);
        const billingProvider = statusQuery.data?.billingProvider ?? null;

        if (decision.reason === "current_price") {
          return tBilling("currentPlanCta");
        }
        if (decision.reason === "subscription_upgrade") {
          if (billingProvider === "waffo" && targetProvider === billingProvider) {
            return tBilling("upgradeUnavailable");
          }
          return tBilling("upgradeSubscription");
        }
        if (decision.reason === "already_lifetime") {
          return tBilling("alreadyLifetime");
        }
        if (decision.reason === "downgrade_or_same_tier") {
          return tBilling("downgradeNotAllowed");
        }

        return tBilling("startCheckout");
      }
    : undefined;

  const isCtaDisabled: PricingMatrixIsCtaDisabled = ({ priceMeta }) => {
    if (ctaPending) {
      return true;
    }
    if (!session) {
      return false;
    }
    if (!priceMeta) {
      return false;
    }
    if (statusQuery.isLoading) {
      return true;
    }

    const decision = getCheckoutDecision(priceMeta);
    const targetProvider = findPriceProvider(plans, priceMeta.priceId);
    const billingProvider = statusQuery.data?.billingProvider ?? null;
    if (
      decision.reason === "subscription_upgrade" &&
      billingProvider === "waffo" &&
      targetProvider === billingProvider
    ) {
      return true;
    }

    return decision.action === "disabled";
  };

  return (
    <Section id="pricing" showHeader={false}>
      {session && statusQuery.data?.billingProvider === "revenuecat" ? (
        <Alert className="mb-6">
          <AlertDescription>{tBilling("storeManagedMessage")}</AlertDescription>
        </Alert>
      ) : null}
      {plansQuery.isLoading ? (
        <PricingSkeletonGrid
          count={4}
          header={<SectionHeader title={resolvedTitle} description={resolvedSubtitle} />}
        />
      ) : (
        <PricingMatrix
          plans={plans}
          header={<SectionHeader title={resolvedTitle} description={resolvedSubtitle} />}
          onSelectPrice={handleSelectPrice}
          getCtaLabel={getCtaLabel}
          isCtaDisabled={isCtaDisabled}
          ctaLoading={ctaPending}
          showCtaArrow
        />
      )}
    </Section>
  );
}
