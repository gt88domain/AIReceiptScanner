import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";
import Animated, { FadeInDown } from "react-native-reanimated";
import { EmailOtpForm } from "@/components/auth/email/email-otp-form";
import { appConfig } from "@/configs/app-config";
import { useAuth } from "@/providers/auth-provider";

export default function EmailOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { refetchSession } = useAuth();

  if (!appConfig.auth.methods.emailOtpEnabled || !email) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <>
      <KeyboardAwareScrollView
        className="flex-1 bg-background"
        bottomOffset={appConfig.keyboardBottomOffset}
      >
        <View className="flex-1 justify-center px-6 py-36">
          <View className="mx-auto w-full max-w-sm">
            <Animated.View className="mb-8" entering={FadeInDown.delay(200)}>
              <EmailOtpForm
                email={email}
                onBack={() => {
                  router.back();
                }}
                onVerified={async () => {
                  await refetchSession();
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
