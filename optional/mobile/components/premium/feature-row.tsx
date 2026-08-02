import { AntDesign } from "@expo/vector-icons";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function FeatureRow({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="size-7 items-center justify-center rounded-full bg-accent/12">
        <AntDesign name="check" size={12} className="text-accent" />
      </View>
      <Text className="flex-1 text-[15px] font-semibold leading-6">{label}</Text>
    </View>
  );
}
