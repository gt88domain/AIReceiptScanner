import * as AppleAuthentication from "expo-apple-authentication";
import { AntDesign } from "@expo/vector-icons";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { useTranslation } from "react-i18next";
import { Platform, View } from "react-native";
import { Text } from "@/components/ui/text";
import { appConfig } from "@/configs/app-config";
import { useSocialSignIn } from "@/hooks/use-social-sign-in";
import { useThemePreference } from "@/providers/theme-provider";

const isAppleSignInVisible = appConfig.auth.methods.appleEnabled && Platform.OS === "ios";
const isGoogleSignInVisible = appConfig.auth.methods.googleEnabled;

export function hasVisibleSocialSignInMethods() {
  return isAppleSignInVisible || isGoogleSignInVisible;
}

export function SocialSignInButtons() {
  const { t } = useTranslation();
  const { signIn: socialSignIn, loading: socialLoading } = useSocialSignIn();
  const { resolvedThemeMode } = useThemePreference();
  const [foregroundColor] = useThemeColor(["foreground"]);

  return (
    <View>
      {isAppleSignInVisible ? (
        <View className="mb-3" pointerEvents={socialLoading === "apple" ? "none" : "auto"}>
          <View className={socialLoading === "apple" ? "opacity-60" : ""}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                resolvedThemeMode === "dark"
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={8}
              onPress={() => socialSignIn("apple")}
              style={{ height: 48, width: "100%" }}
            />
          </View>
          {socialLoading === "apple" ? (
            <View className="absolute inset-0 items-center justify-center">
              <Spinner size="sm" className="text-accent-foreground" />
            </View>
          ) : null}
        </View>
      ) : null}

      {isGoogleSignInVisible ? (
        <Button
          variant="outline"
          onPress={() => socialSignIn("google")}
          isDisabled={socialLoading !== null}
          className="h-12 flex-row items-center justify-center rounded-md"
        >
          {socialLoading === "google" ? (
            <View className="flex-row items-center">
              <Spinner size="sm" className="mr-2 text-foreground" />
              <Text className="text-lg font-medium text-foreground">{t("auth.signingIn")}</Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <AntDesign name="google" className="mr-1" size={20} color={foregroundColor} />
              <Text className="text-lg font-medium text-foreground">
                {t("auth.signInWithGoogle")}
              </Text>
            </View>
          )}
        </Button>
      ) : null}
    </View>
  );
}
