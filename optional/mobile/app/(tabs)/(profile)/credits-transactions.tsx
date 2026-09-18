import { Skeleton, Spinner, Tabs, useThemeColor } from "heroui-native";
import { resolveCreditTransactionLabel, resolveCreditTransactionSource } from "@repo/shared";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useCreditTransactions } from "@/hooks/use-credits";
import { useTabBarVisibility } from "@/providers/tab-bar-provider";

type CreditTransactionItem = ReturnType<typeof useCreditTransactions>["transactions"][number];
type TransactionFilter = "all" | "purchase" | "usage";
const transactionFilters = ["all", "purchase", "usage"] as const;

function TransactionSkeleton() {
  return (
    <View className="mb-3 rounded-2xl border border-border bg-surface px-4 py-3">
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1 gap-2">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-4 w-40 rounded-md" />
        </View>
        <Skeleton className="h-5 w-12 rounded-md" />
      </View>
    </View>
  );
}

function resolveCreditTransactionLabelText(
  t: ReturnType<typeof useTranslation>["t"],
  sourceType: string,
) {
  return t(`credits.transactions.${resolveCreditTransactionLabel(sourceType)}`);
}

function resolveCreditTransactionSourceLabel(
  t: ReturnType<typeof useTranslation>["t"],
  sourceProvider: string,
) {
  const sourceKey = resolveCreditTransactionSource(sourceProvider);
  return sourceKey === "provider" ? sourceProvider : t(`credits.transactionSources.${sourceKey}`);
}

function resolveCreditTransactionPackageLabel(
  t: ReturnType<typeof useTranslation>["t"],
  packageId: string,
) {
  return t(`credits.packages.${packageId}.title`);
}

/** Account credit ledger with income and spending in one timeline. */
export default function CreditsTransactionsScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const transactions = useCreditTransactions(filter === "all" ? undefined : filter);
  const [backgroundColor] = useThemeColor(["background"]);

  useTabBarVisibility(true);

  const handleEndReached = useCallback(() => {
    if (transactions.hasNextPage && !transactions.isFetchingNextPage) {
      void transactions.fetchNextPage();
    }
  }, [transactions.fetchNextPage, transactions.hasNextPage, transactions.isFetchingNextPage]);

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value as TransactionFilter);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CreditTransactionItem }) => {
      const details = [
        resolveCreditTransactionSourceLabel(t, item.sourceProvider),
        item.packageId ? resolveCreditTransactionPackageLabel(t, item.packageId) : null,
        new Date(item.createdAt).toLocaleDateString(),
      ].filter(Boolean);

      return (
        <View className="mb-3 rounded-2xl border border-border bg-surface px-4 py-3">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1">
              <Text className="text-base font-semibold">
                {resolveCreditTransactionLabelText(t, item.sourceType)}
              </Text>
              <Text className="mt-1 text-xs text-muted">{details.join(" - ")}</Text>
            </View>
            <Text
              className={`text-base font-bold ${item.amount >= 0 ? "text-success" : "text-danger"}`}
            >
              {item.amount >= 0 ? "+" : ""}
              {item.amount}
            </Text>
          </View>
        </View>
      );
    },
    [t],
  );

  const renderFilter = useCallback(
    () => (
      <View className="pb-4 pt-2">
        <Tabs value={filter} onValueChange={handleFilterChange} variant="primary">
          <Tabs.List>
            <Tabs.Indicator />
            {transactionFilters.map((item) => (
              <Tabs.Trigger key={item} value={item} className="flex-1">
                <Tabs.Label>{t(`credits.transactionFilters.${item}`)}</Tabs.Label>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
      </View>
    ),
    [filter, handleFilterChange, t],
  );

  const renderEmpty = useCallback(
    () =>
      transactions.isLoading ? (
        <View>
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <TransactionSkeleton key={item} />
          ))}
        </View>
      ) : (
        <View className="rounded-2xl border border-border bg-surface px-4 py-5">
          <Text className="text-sm leading-5 text-muted">{t("credits.emptyTransactions")}</Text>
        </View>
      ),
    [transactions.isLoading, t],
  );

  return (
    <FlatList
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingBottom: 32,
        backgroundColor,
        flexGrow: 1,
      }}
      data={transactions.transactions}
      keyExtractor={(item) => item.id}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.35}
      renderItem={renderItem}
      ListHeaderComponent={renderFilter}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={
        transactions.isFetchingNextPage ? (
          <View className="items-center py-4">
            <Spinner size="sm" />
          </View>
        ) : null
      }
    />
  );
}
