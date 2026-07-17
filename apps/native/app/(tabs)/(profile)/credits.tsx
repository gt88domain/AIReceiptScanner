import { Button, Skeleton, Spinner, useThemeColor } from "heroui-native";
import { formatCurrency } from "@repo/shared";
import { Coins } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { AnimatedNumberText } from "@/components/ui/animated-number-text";
import { FullScreenHud } from "@/components/ui/full-screen-hud";
import { Text } from "@/components/ui/text";
import { useCredits } from "@/hooks/use-credits";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/auth-provider";
import { useTabBarVisibility } from "@/providers/tab-bar-provider";
import { useRouter } from "expo-router";

/** Purchase overlay phase shown while the store and server ledger settle. */
type PurchasePhase = "processing" | "syncing" | null;

function CreditPackageSkeleton() {
  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1 gap-2">
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-4 w-11/12 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </View>
        <Skeleton className="h-7 w-12 rounded-md" />
      </View>
      <Skeleton className="mt-4 h-11 w-full rounded-xl" />
    </View>
  );
}

/** Profile credit page with balance and packages. */
export default function CreditsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const credits = useCredits();
  const { isAuthenticated, isPending } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const [purchasePhase, setPurchasePhase] = useState<PurchasePhase>(null);
  const [mutedColor, backgroundColor] = useThemeColor(["muted", "background"]);

  useTabBarVisibility(true);

  /** Selects the HUD copy for the current purchase phase. */
  const hudContent = useMemo(() => {
    if (purchasePhase === "syncing") {
      return {
        title: t("credits.hud.syncingTitle"),
        description: t("credits.hud.syncingDescription"),
      };
    }

    return {
      title: t("credits.hud.processingTitle"),
      description: t("credits.hud.processingDescription"),
    };
  }, [purchasePhase, t]);

  /** Opens the auth flow before allowing account-bound credit purchases. */
  const handleSignIn = useCallback(() => {
    router.push("/(auth)/sign-in");
  }, [router]);

  /** Starts a RevenueCat credit package purchase and waits for server ledger sync. */
  const handlePurchase = useCallback(
    async (packageId: string) => {
      if (!isAuthenticated) {
        handleSignIn();
        return;
      }

      if (!credits.isAvailable) {
        toastError(t("credits.feedback.unavailable"));
        return;
      }

      try {
        setPurchasePhase("processing");
        const result = await credits.purchase(packageId);
        if (result.status === "cancelled") {
          toastError(t("credits.feedback.purchaseCancelled"));
          setPurchasePhase(null);
          return;
        }

        setPurchasePhase("syncing");
        await credits.refetchCredits();
        if (result.synced) {
          toastSuccess(t("credits.feedback.purchaseSynced"));
        } else {
          toastSuccess(t("credits.feedback.purchasePending"));
        }
      } catch {
        toastError(t("credits.feedback.purchaseFailed"));
      } finally {
        setPurchasePhase(null);
      }
    },
    [credits, handleSignIn, isAuthenticated, t, toastError, toastSuccess],
  );

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, backgroundColor }}
      >
        <Animated.View entering={FadeIn.duration(300)} className="pt-2">
          <View className="rounded-3xl border border-border bg-surface p-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-sm font-semibold uppercase text-muted">
                  {t("credits.balanceLabel")}
                </Text>
                <View className="mt-2">
                  <AnimatedNumberText
                    value={credits.balance?.balance ?? 0}
                    className="text-4xl font-bold"
                  />
                </View>
              </View>
              <View className="size-12 items-center justify-center rounded-2xl bg-accent/10">
                <Coins size={24} color={mutedColor} />
              </View>
            </View>
            {credits.balance?.expiringCredits ? (
              <Text className="mt-4 text-sm leading-5 text-warning">
                {t("credits.expiringNotice", { count: credits.balance.expiringCredits })}
              </Text>
            ) : (
              <Text className="mt-4 text-sm leading-5 text-muted">
                {t("credits.balanceDescription")}
              </Text>
            )}
          </View>

          {!isAuthenticated && !isPending ? (
            <View className="mt-5 rounded-2xl border border-border bg-surface p-4">
              <Text className="text-base font-bold">{t("credits.signInTitle")}</Text>
              <Text className="mt-1 text-sm leading-5 text-muted">
                {t("credits.signInDescription")}
              </Text>
              <Button className="mt-4 h-11 items-center justify-center" onPress={handleSignIn}>
                <Button.Label className="font-bold">{t("auth.signIn")}</Button.Label>
              </Button>
            </View>
          ) : null}

          <Animated.View entering={FadeInUp.delay(80).duration(320)} className="mt-8">
            <Text className="mb-3 text-xl font-bold">{t("credits.packagesTitle")}</Text>
            <View className="gap-3">
              {credits.isPackagesLoading ? (
                [0, 1].map((item) => <CreditPackageSkeleton key={item} />)
              ) : credits.packages.length ? (
                credits.packages.map((item) => (
                  <View key={item.id} className="rounded-2xl border border-border bg-surface p-4">
                    <View className="flex-row items-start justify-between gap-4">
                      <View className="flex-1">
                        <Text className="text-lg font-bold">
                          {t(`credits.packages.${item.id}.title`)}
                        </Text>
                        <Text className="mt-1 text-sm leading-5 text-muted">
                          {t(`credits.packages.${item.id}.description`, {
                            count: item.amount,
                          })}
                        </Text>
                        <Text className="mt-2 text-sm text-muted">
                          {formatCurrency(item.amountCents, item.currency)}
                        </Text>
                      </View>
                      <Text className="text-xl font-bold">{item.amount}</Text>
                    </View>
                    <Button
                      className="mt-4 h-11 items-center justify-center"
                      feedbackVariant="scale-ripple"
                      isDisabled={
                        credits.isPurchasing || credits.isSyncing || !item.providerProductId
                      }
                      onPress={() => handlePurchase(item.id)}
                    >
                      {credits.isPurchasing || credits.isSyncing ? (
                        <>
                          <Spinner size="sm" className="text-primary-foreground" />
                          <Button.Label className="font-bold">
                            {t("credits.actions.processing")}
                          </Button.Label>
                        </>
                      ) : (
                        <Button.Label className="font-bold">
                          {t("credits.actions.buy")}
                        </Button.Label>
                      )}
                    </Button>
                  </View>
                ))
              ) : (
                <View className="rounded-2xl border border-border bg-surface p-4">
                  <Text className="text-sm leading-5 text-muted">{t("credits.emptyPackages")}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </ScrollView>

      <FullScreenHud
        visible={purchasePhase !== null}
        title={hudContent.title}
        description={hudContent.description}
      />
    </>
  );
}
