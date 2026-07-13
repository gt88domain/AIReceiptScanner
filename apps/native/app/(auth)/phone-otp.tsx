import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useThemeColor } from "heroui-native";
import * as React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useTranslation } from "react-i18next";
import { PhoneOtpForm } from "@/components/auth/phone/phone-otp-form";

export default function PhoneOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const { t } = useTranslation();
  const [fieldPlaceholderColor] = useThemeColor(["field-placeholder"]);

  if (!appConfig.auth.methods.smsEnabled || !phoneNumber) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <>
      <KeyboardAwareScrollView
        className="flex-1 bg-background"
        bottomOffset={appConfig.keyboardBottomOffset}
      >
        <Pressable
          onPress={() => router.back()}
          className="absolute right-6 z-10 items-center justify-center rounded-full"
          style={{ top: insets.top + 12 }}
        >
          <MaterialIcons name="close" size={30} color={fieldPlaceholderColor} />
        </Pressable>
        <View className="flex-1 justify-center px-6 py-24">
          <View className="mx-auto w-full max-w-sm">
            <Animated.View className="mb-8" entering={FadeInUp.delay(100)}>
              <View className="mb-2">
                <Text className="mb-2 text-3xl font-bold tracking-tight text-foreground">
                  {t("auth.signInTitle")}
                </Text>
                <Text className="text-sm text-muted">{t("auth.phoneOtpDescription")}</Text>
              </View>
            </Animated.View>

            <Animated.View className="mb-8" entering={FadeInDown.delay(200)}>
              <PhoneOtpForm
                phoneNumber={phoneNumber}
                onBack={() => {
                  router.back();
                }}
                onVerified={() => {
                  router.dismissTo("/(tabs)/(home)");
                }}
              />
            </Animated.View>
          </View>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  );
}
