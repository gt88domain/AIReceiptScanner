import { useCallback, useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, View, type ViewToken } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { Button, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingPage {
  key: string;
  titleKey: string;
  descriptionKey: string;
  icon: "rocket-launch" | "devices" | "check-circle";
}

const PAGES: OnboardingPage[] = [
  {
    key: "page1",
    titleKey: "onboarding.page1.title",
    descriptionKey: "onboarding.page1.description",
    icon: "rocket-launch",
  },
  {
    key: "page2",
    titleKey: "onboarding.page2.title",
    descriptionKey: "onboarding.page2.description",
    icon: "devices",
  },
  {
    key: "page3",
    titleKey: "onboarding.page3.title",
    descriptionKey: "onboarding.page3.description",
    icon: "check-circle",
  },
];

function PaginationDot({ index, activeIndex }: { index: number; activeIndex: number }) {
  const [accentColor, mutedColor] = useThemeColor(["accent", "muted"]);
  const isActive = index === activeIndex;

  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(isActive ? 24 : 8, {
      damping: 15,
      stiffness: 150,
    }),
    opacity: withTiming(isActive ? 1 : 0.3, { duration: 300 }),
    backgroundColor: isActive ? accentColor : mutedColor,
  }));

  return <Animated.View style={animatedStyle} className="mx-1 h-2 rounded-full" />;
}

function OnboardingPageView({
  page,
  index,
  scrollX,
}: {
  page: OnboardingPage;
  index: number;
  scrollX: { value: number };
}) {
  const { t } = useTranslation();
  const [accentColor] = useThemeColor(["accent"]);

  const animatedIconStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const scale = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6]);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0]);
    const translateY = interpolate(scrollX.value, inputRange, [40, 0, 40]);

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0]);
    const translateY = interpolate(scrollX.value, inputRange, [20, 0, 20]);

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center px-10">
      <Animated.View
        style={animatedIconStyle}
        className="mb-12 h-40 w-40 items-center justify-center rounded-[40px] bg-surface-secondary"
      >
        <MaterialIcons name={page.icon} size={72} color={accentColor} />
      </Animated.View>

      <Animated.View style={animatedTextStyle} className="items-center">
        <Text className="mb-4 text-center text-3xl font-bold tracking-tight text-foreground">
          {t(page.titleKey)}
        </Text>
        <Text className="text-center text-base leading-relaxed text-muted">
          {t(page.descriptionKey)}
        </Text>
      </Animated.View>
    </View>
  );
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const [accentForegroundColor] = useThemeColor(["accent-foreground"]);

  const isLastPage = activeIndex === PAGES.length - 1;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems.at(0)?.index !== null) {
        setActiveIndex(viewableItems.at(0)?.index ?? 0);
      }
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (isLastPage) {
      onComplete();
      return;
    }
    flatListRef.current?.scrollToIndex({
      index: activeIndex + 1,
      animated: true,
    });
  }, [activeIndex, isLastPage, onComplete]);

  return (
    <View className="flex-1 bg-background">
      {/* Skip button */}
      <Animated.View
        entering={FadeIn.delay(500)}
        className="absolute right-6 z-10"
        style={{ top: insets.top + 12 }}
      >
        {!isLastPage ? (
          <Pressable onPress={onComplete} className="rounded-full px-4 py-2">
            <Text className="text-base font-medium text-muted">{t("onboarding.skip")}</Text>
          </Pressable>
        ) : null}
      </Animated.View>

      {/* App icon */}
      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        className="items-center"
        style={{ paddingTop: insets.top + 48 }}
      >
        <Image
          source={require("@/assets/images/icon-medium.png")}
          style={{ width: 56, height: 56 }}
          contentFit="contain"
        />
      </Animated.View>

      {/* Pages */}
      <FlatList
        ref={flatListRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={(event) => {
          scrollX.value = event.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index }) => (
          <OnboardingPageView page={item} index={index} scrollX={scrollX} />
        )}
      />

      {/* Bottom section */}
      <Animated.View
        entering={FadeInUp.delay(600)}
        className="items-center px-6"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Pagination dots */}
        <View className="mb-8 flex-row items-center justify-center">
          {PAGES.map((page, index) => (
            <PaginationDot key={page.key} index={index} activeIndex={activeIndex} />
          ))}
        </View>

        {/* Action button */}
        <Button
          variant="primary"
          feedbackVariant="scale-ripple"
          onPress={handleNext}
          className="h-14 w-full items-center justify-center rounded-xl"
        >
          <View className="flex-row items-center">
            <Text className="text-xl font-semibold text-accent-foreground">
              {isLastPage ? t("onboarding.getStarted") : t("onboarding.next")}
            </Text>
            {!isLastPage ? (
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color={accentForegroundColor}
                style={{ marginLeft: 4 }}
              />
            ) : null}
          </View>
        </Button>
      </Animated.View>
    </View>
  );
}
