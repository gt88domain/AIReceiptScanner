import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type PlanCardProps = {
  badge?: string;
  billingNote: string;
  isCurrent?: boolean;
  isDisabled?: boolean;
  isSelected: boolean;
  onPress: () => void;
  price: string;
  suffix?: string;
  title: string;
};

function RadioIndicator({ isSelected }: { isSelected: boolean }) {
  const progress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isSelected ? 1 : 0, {
      damping: 16,
      mass: 0.6,
      stiffness: 240,
    });
  }, [isSelected, progress]);

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
    opacity: progress.value,
  }));

  return (
    <View
      className={cn(
        "size-[22px] items-center justify-center rounded-full border-2",
        isSelected ? "border-accent" : "border-muted/40",
      )}
    >
      <Animated.View style={innerStyle} className="size-[12px] rounded-full bg-accent" />
    </View>
  );
}

export function PlanCard({
  badge,
  billingNote,
  isCurrent,
  isDisabled,
  isSelected,
  onPress,
  price,
  suffix,
  title,
}: PlanCardProps) {
  const { t } = useTranslation();

  return (
    <Pressable onPress={onPress} disabled={isDisabled}>
      <Animated.View
        layout={LinearTransition.springify().damping(20).stiffness(200)}
        className={cn(
          "flex-row items-center rounded-xl border border-border/50 bg-surface-secondary/20 px-4 py-3.5",
          isSelected && !isDisabled && "border-accent/60 bg-accent/8",
          isDisabled && "opacity-40",
        )}
      >
        <RadioIndicator isSelected={isSelected && !isDisabled} />

        <View className="ml-3 flex-1">
          <View className="flex-row items-center gap-2">
            <Text
              className={cn(
                "text-[15px] font-semibold",
                isSelected && !isDisabled && "text-foreground",
              )}
            >
              {title}
            </Text>
            {isCurrent ? (
              <View className="rounded-md bg-muted/15 px-2 py-0.5">
                <Text className="text-[10px] font-bold tracking-wide text-muted">
                  {t("premium.currentPlan")}
                </Text>
              </View>
            ) : badge ? (
              <View className="rounded-md bg-accent/15 px-2 py-0.5">
                <Text className="text-[10px] font-bold tracking-wide text-accent">{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-0.5 text-xs text-muted">{billingNote}</Text>
        </View>

        <View className="items-end">
          <Text selectable className="text-lg font-bold" style={{ fontVariant: ["tabular-nums"] }}>
            {price}
          </Text>
          {suffix ? <Text className="text-[11px] text-muted">{suffix}</Text> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}
