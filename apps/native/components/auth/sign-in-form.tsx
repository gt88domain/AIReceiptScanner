import { Image } from "expo-image";
import { Link } from "expo-router";
import { Tabs } from "heroui-native";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";
import * as React from "react";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { EmailOtpRequestForm } from "./email/email-otp-request-form";
import { EmailSignInForm } from "./email/email-sign-in-form";
import { PhoneSignInForm } from "./phone/phone-sign-in-form";
import { hasVisibleSocialSignInMethods, SocialSignInButtons } from "./social-sign-in-buttons";

type SignInMethod = "email" | "phone" | "otp";

const enabledSignInMethods = [
  appConfig.auth.methods.emailPasswordEnabled ? "email" : null,
  appConfig.auth.methods.smsEnabled ? "phone" : null,
  appConfig.auth.methods.emailOtpEnabled ? "otp" : null,
].filter((method): method is SignInMethod => method !== null);
const defaultSignInMethod = enabledSignInMethods[0] ?? "email";
const hasSocialSignInMethods = hasVisibleSocialSignInMethods();

export function SignInForm() {
  const [activeMethod, setActiveMethod] = React.useState<SignInMethod>(defaultSignInMethod);
  const { t } = useTranslation();
  const hasAuthMethods = enabledSignInMethods.length > 0;
  const shouldShowAuthTabs = enabledSignInMethods.length > 1;

  function handleMethodChange(value: string) {
    if (!enabledSignInMethods.includes(value as SignInMethod)) return;
    setActiveMethod(value as SignInMethod);
  }

  function renderSignInMethodContent(method: SignInMethod) {
    switch (method) {
      case "email":
        return <EmailSignInForm />;
      case "phone":
        return <PhoneSignInForm />;
      case "otp":
        return <EmailOtpRequestForm />;
    }
  }

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

            {hasAuthMethods && shouldShowAuthTabs ? (
              <Animated.View className="mb-8" entering={FadeInDown.delay(200)}>
                <Tabs value={activeMethod} onValueChange={handleMethodChange} variant="primary">
                  <Tabs.List className="mb-6">
                    <Tabs.Indicator />
                    {appConfig.auth.methods.emailPasswordEnabled ? (
                      <Tabs.Trigger value="email" className="flex-1">
                        <Tabs.Label>{t("auth.emailTab")}</Tabs.Label>
                      </Tabs.Trigger>
                    ) : null}
                    {appConfig.auth.methods.smsEnabled ? (
                      <Tabs.Trigger value="phone" className="flex-1">
                        <Tabs.Label>{t("auth.phoneTab")}</Tabs.Label>
                      </Tabs.Trigger>
                    ) : null}
                    {appConfig.auth.methods.emailOtpEnabled ? (
                      <Tabs.Trigger value="otp" className="flex-1">
                        <Tabs.Label>{t("auth.emailOtpMode")}</Tabs.Label>
                      </Tabs.Trigger>
                    ) : null}
                  </Tabs.List>

                  <Animated.View layout={LinearTransition.duration(200)}>
                    {appConfig.auth.methods.emailPasswordEnabled ? (
                      <Tabs.Content value="email">
                        {renderSignInMethodContent("email")}
                      </Tabs.Content>
                    ) : null}
                    {appConfig.auth.methods.smsEnabled ? (
                      <Tabs.Content value="phone">
                        {renderSignInMethodContent("phone")}
                      </Tabs.Content>
                    ) : null}
                    {appConfig.auth.methods.emailOtpEnabled ? (
                      <Tabs.Content value="otp">{renderSignInMethodContent("otp")}</Tabs.Content>
                    ) : null}
                  </Animated.View>
                </Tabs>
              </Animated.View>
            ) : null}
            {hasAuthMethods && !shouldShowAuthTabs ? (
              <Animated.View className="mb-8" entering={FadeInDown.delay(200)}>
                {renderSignInMethodContent(activeMethod)}
              </Animated.View>
            ) : null}

            {hasSocialSignInMethods ? (
              <>
                {hasAuthMethods ? (
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

            {activeMethod === "email" && appConfig.auth.methods.emailPasswordEnabled ? (
              <Animated.View
                key="signup-link"
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
