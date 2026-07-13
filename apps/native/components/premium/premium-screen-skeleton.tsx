import { Skeleton } from "heroui-native/skeleton";
import { ScrollView, View } from "react-native";

function SkeletonContent({ features }: { features: readonly string[] }) {
  return (
    <View className="px-0 pb-10 pt-2">
      <View className="mt-3 gap-3">
        <Skeleton className="h-5 w-11/12 rounded-md" />
        <Skeleton className="h-5 w-4/5 rounded-md" />
      </View>

      <View className="mt-8 gap-4">
        {features.map((feature) => (
          <View key={feature} className="flex-row items-center gap-3">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-5 flex-1 rounded-md" />
          </View>
        ))}
      </View>

      <View className="mt-10 gap-3">
        {[0, 1].map((item) => (
          <View key={item} className="rounded-2xl border border-border bg-surface-secondary/40 p-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-2">
                <Skeleton className="h-5 w-28 rounded-md" />
                <Skeleton className="h-4 w-36 rounded-md" />
              </View>
            </View>

            <View className="mt-4 flex-row items-end gap-2">
              <Skeleton className="h-7 w-24 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </View>
          </View>
        ))}
      </View>

      <View className="mt-7">
        <Skeleton className="h-12 w-full rounded-xl" />
        <View className="mt-4 items-center gap-2">
          <Skeleton className="h-4 w-11/12 rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
        </View>
        <View className="mt-10 flex-row items-center justify-center gap-3">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-md" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </View>
      </View>
    </View>
  );
}

export function PremiumScreenSkeleton({
  backgroundColor,
  features,
  inline,
}: {
  backgroundColor: string;
  features: readonly string[];
  inline?: boolean;
}) {
  if (inline) {
    return <SkeletonContent features={features} />;
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: 24,
        backgroundColor,
      }}
    >
      <SkeletonContent features={features} />
    </ScrollView>
  );
}
