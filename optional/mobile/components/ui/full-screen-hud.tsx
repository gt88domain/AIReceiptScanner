import { Spinner } from "heroui-native";
import { Modal, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { Text } from "@/components/ui/text";

export function FullScreenHud({
  description,
  title,
  visible,
}: {
  description?: string;
  title: string;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" transparent statusBarTranslucent visible={visible}>
      <View className="flex-1 items-center justify-center bg-black/45 px-6">
        <Animated.View
          entering={FadeIn.duration(160)}
          className="w-full max-w-[280px] rounded-[28px] border border-border bg-surface px-6 py-6"
        >
          <Animated.View entering={ZoomIn.duration(180)} className="items-center">
            <Spinner size="lg" className="text-accent" />
            <Text className="mt-5 text-center text-lg font-semibold">{title}</Text>
            {description ? (
              <Text className="mt-2 text-center text-sm leading-6 text-muted">{description}</Text>
            ) : null}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
