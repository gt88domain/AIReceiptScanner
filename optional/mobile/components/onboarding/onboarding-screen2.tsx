import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Headphones, BookOpen, Flame, Check } from "lucide-react-native";

const steps = [
  {
    id: "1",
    title: "Listen or read on the go & grow",
    description: "Transform your commute into learning time with bite-sized book summaries.",
    icon: Headphones,
  },
  {
    id: "2",
    title: "Discover new perspectives",
    description: "Explore thousands of books and articles across various categories.",
    icon: BookOpen,
  },
  {
    id: "3",
    title: "Track your learning streak",
    description: "Build a daily reading habit and watch your knowledge grow day by day.",
    icon: Flame,
  },
  {
    id: "4",
    title: "Apply what you learn",
    description: "Turn knowledge into action with practical insights and actionable takeaways.",
    icon: Check,
  },
];

interface OnboardingProps {
  onComplete?: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingProps) {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollX = useRef(new Animated.Value(0)).current;
  const progressAnims = useMemo(() => steps.map(() => new Animated.Value(0)), []);
  const slidesRef = useRef<FlatList>(null);

  const scrollTo = useCallback((index: number) => {
    if (index < steps.length) {
      slidesRef.current?.scrollToIndex({ index, animated: true });
    }
  }, []);

  useEffect(() => {
    // If we swiped back from the last page, resume auto-playing
    if (currentIndex < steps.length - 1 && !isAutoPlaying) {
      setIsAutoPlaying(true);
      return;
    }

    // Reset all animations to their base state based on the current index
    steps.forEach((_, index) => {
      if (index < currentIndex) {
        progressAnims[index].setValue(1);
      } else if (index > currentIndex) {
        progressAnims[index].setValue(0);
      }
    });

    const activeAnim = progressAnims[currentIndex];

    if (isAutoPlaying) {
      // Ensure it starts from 0 for a clean animation
      activeAnim.setValue(0);
      const animation = Animated.timing(activeAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      });

      animation.start(({ finished }) => {
        if (finished && currentIndex < steps.length - 1) {
          scrollTo(currentIndex + 1);
        } else if (finished) {
          setIsAutoPlaying(false);
        }
      });

      return () => {
        animation.stop();
      };
    } else {
      // Manual interaction or last page: fill current bar quickly
      Animated.timing(activeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentIndex, isAutoPlaying, scrollTo]);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = useCallback(
    ({ item }: { item: (typeof steps)[0] }) => {
      const Icon = item.icon;
      return (
        <View className="flex-1 items-center justify-center px-8 pb-16" style={{ width }}>
          <View className="w-32 h-32 rounded-full bg-gray-50 items-center justify-center mb-12">
            <Icon size={48} color="#111827" strokeWidth={1.5} />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-4">{item.title}</Text>
          <Text className="text-base text-gray-500 text-center leading-6">{item.description}</Text>
        </View>
      );
    },
    [width],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* Progress Bar */}
      <View className="px-6 pt-4">
        <View className="flex-row gap-2 w-full">
          {steps.map((_, index) => (
            <View key={index} className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
              <Animated.View
                className="h-full bg-blue-600 rounded-full"
                style={{
                  width: progressAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                }}
              />
            </View>
          ))}
        </View>
        <View className="items-end mt-4 h-5">
          {currentIndex < steps.length - 1 ? (
            <TouchableOpacity
              onPress={() => {
                setIsAutoPlaying(false);
                onComplete?.();
              }}
            >
              <Text className="text-gray-400 text-sm font-medium">Skip</Text>
            </TouchableOpacity>
          ) : (
            <View className="h-5" />
          )}
        </View>
      </View>

      {/* Slides */}
      <View className="flex-1">
        <FlatList
          data={steps}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: false,
          })}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
        />
      </View>

      {/* Footer */}
      <View className="px-6 pb-12 items-center">
        <Text className="text-gray-400 text-sm mb-8">
          {currentIndex + 1} of {steps.length}
        </Text>
        <View className="w-full h-14">
          {currentIndex === steps.length - 1 && (
            <TouchableOpacity
              className="bg-blue-600 w-full h-14 rounded-full items-center justify-center shadow-md shadow-blue-600/20"
              activeOpacity={0.8}
              onPress={() => onComplete?.()}
            >
              <Text className="text-white text-lg font-semibold">Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
