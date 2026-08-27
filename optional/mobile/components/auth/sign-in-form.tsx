import { Image } from "expo-image";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { EmailSignInForm } from "./email/email-sign-in-form";
import { hasVisibleSocialSignInMethods, SocialSignInButtons } from "./social-sign-in-buttons";

const hasSocialSignInMethods = hasVisibleSocialSignInMethods();

export function SignInForm() {
  const { t } = useTranslation();
  const hasEmailSignIn = appConfig.auth.methods.emailPasswordEnabled;

  return (
    <>
      <KeyboardAwareScrollView
        className="flex-1 bg-background"
        bottomOffset={appConfig.keyboardBottomOffset}
      >
        <View className="flex-1 justify-center px-6 py-24">
          <View className="mx-auto w-full max-w-sm">
            <Animated.View className="mb-8" entering={FadeInUp.delay(100)}>
              <Image
                source={require("@/assets/images/icon-medium.png")}
                style={{ width: 72, height: 72 }}
                contentFit="contain"
              />
              <View className="mb-2">
                <Text className="mb-2 text-3xl font-bold tracking-tight text-foreground">
                  {t("auth.signInTitle")}
                </Text>
              </View>
            </Animated.View>

            {hasEmailSignIn ? (
              <Animated.View className="mb-8" entering={FadeInDown.delay(200)}>
                <EmailSignInForm />
              </Animated.View>
            ) : null}

            {hasSocialSignInMethods ? (
              <>
                {hasEmailSignIn ? (
                  <View className="mb-6 flex-row items-center">
                    <View className="h-px flex-1 bg-border" />
                    <Text className="mx-4 text-xs font-medium uppercase tracking-wider text-muted">
                      {t("auth.orContinueWith")}
                    </Text>
                    <View className="h-px flex-1 bg-border" />
                  </View>
                ) : null}
                <Animated.View className="mb-6" entering={FadeInUp.delay(300)}>
                  <SocialSignInButtons />
                </Animated.View>
              </>
            ) : null}

            {hasEmailSignIn ? (
              <Animated.View
                className="items-center"
                entering={FadeIn.duration(200).delay(100)}
                exiting={FadeOut.duration(150)}
              >
                <View className="flex-row items-center">
                  <Text className="text-sm text-muted">{t("auth.noAccount")} </Text>
                  <Link href="/(auth)/sign-up" asChild>
                    <Pressable>
                      <Text className="text-sm font-medium text-link">{t("auth.signUp")}</Text>
                    </Pressable>
                  </Link>
                </View>
              </Animated.View>
            ) : null}
          </View>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  );
}
