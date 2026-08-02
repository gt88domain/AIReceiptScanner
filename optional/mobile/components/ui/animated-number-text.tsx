import { useEffect, useLayoutEffect, useRef } from "react";
import { View, type LayoutChangeEvent, type StyleProp, type TextStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";

type AnimatedNumberTextProps = {
  value: number;
  className?: string;
  digitHeight?: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
};

type AnimatedNumberDigitProps = {
  digit: number;
  direction: 1 | -1;
  initialDigit: number;
  className?: string;
  digitHeight: number;
  duration: number;
  style?: StyleProp<TextStyle>;
};

function AnimatedNumberDigit({
  digit,
  direction,
  initialDigit,
  className,
  digitHeight,
  duration,
  style,
}: AnimatedNumberDigitProps) {
  const initialDigitRef = useRef(initialDigit);
  const previousDigitRef = useRef(initialDigitRef.current);
  const progress = useSharedValue(initialDigitRef.current === digit ? 1 : 0);
  const measuredDigitHeight = useSharedValue(digitHeight);

  useLayoutEffect(() => {
    const previousDigit = previousDigitRef.current;
    if (previousDigit === digit) {
      progress.value = 1;
      return;
    }

    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          progress.value = 1;
        }
      },
    );
    previousDigitRef.current = digit;
  }, [digit, duration, progress]);

  const handleDigitLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0) {
      measuredDigitHeight.value = nextHeight;
    }
  };

  const previousDigitStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -direction * progress.value * measuredDigitHeight.value }],
  }));

  const nextDigitStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: direction * (1 - progress.value) * measuredDigitHeight.value }],
  }));

  const textStyle = [style, { fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] }];

  return (
    <View style={{ overflow: "hidden" }}>
      <Text
        className={className}
        style={[...textStyle, { opacity: 0 }]}
        onLayout={handleDigitLayout}
      >
        8
      </Text>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, previousDigitStyle]}>
        <Text className={className} style={textStyle}>
          {previousDigitRef.current}
        </Text>
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, nextDigitStyle]}>
        <Text className={className} style={textStyle}>
          {digit}
        </Text>
      </Animated.View>
    </View>
  );
}

export function AnimatedNumberText({
  value,
  className,
  digitHeight = 48,
  duration = 260,
  style,
}: AnimatedNumberTextProps) {
  const numericValue = Number.isFinite(value) ? Math.trunc(value) : 0;
  const previousValueRef = useRef(numericValue);
  const previousValue = previousValueRef.current;
  const direction = numericValue >= previousValue ? 1 : -1;
  const digits = String(Math.abs(numericValue)).split("").map(Number);
  const previousDigits = String(Math.abs(previousValue)).split("").map(Number);

  useEffect(() => {
    previousValueRef.current = numericValue;
  }, [numericValue]);

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={String(numericValue)}
      className="flex-row items-baseline"
    >
      {numericValue < 0 ? (
        <Text
          className={className}
          style={[style, { fontVariant: ["tabular-nums"] }]}
        >
          -
        </Text>
      ) : null}
      {digits.map((digit, index) => {
        const positionFromRight = digits.length - index - 1;
        const previousDigit =
          previousDigits[previousDigits.length - positionFromRight - 1] ??
          (direction > 0 ? (digit + 9) % 10 : (digit + 1) % 10);

        return (
          <AnimatedNumberDigit
            key={positionFromRight}
            digit={digit}
            direction={direction}
            initialDigit={previousDigit}
            className={className}
            digitHeight={digitHeight}
            duration={duration}
            style={style}
          />
        );
      })}
    </View>
  );
}
