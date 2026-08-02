import { Stack, usePathname, useRouter } from "expo-router";
import { useThemeColor } from "heroui-native";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/providers/auth-provider";

export default function AuthLayout() {
  const { isAuthenticated, isPending } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const isCallbackRoute = pathname === "/callback" || pathname.endsWith("/callback");

  const isResetPasswordRoute =
    pathname === "/reset-password" || pathname.endsWith("/reset-password");

  const [backgroundColor, accentColor] = useThemeColor(["background", "accent"]);

  React.useEffect(() => {
    if (!isPending && isAuthenticated && !isCallbackRoute && !isResetPasswordRoute) {
      router.dismissTo("/(tabs)/(home)");
    }
  }, [isAuthenticated, isCallbackRoute, isPending, isResetPasswordRoute, router]);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={accentColor} />
      </View>
    );
  }

  if (isAuthenticated && !isCallbackRoute && !isResetPasswordRoute) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={accentColor} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor },
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false, title: "" }} />
      <Stack.Screen
        name="email-otp"
        options={{
          title: t("auth.verificationCode"),
          headerShown: true,
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="callback"
        options={{ headerShown: false, title: "", presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          title: "",
          headerShown: true,
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "",
          headerShown: true,
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          title: "",
          headerShown: true,
          headerTransparent: true,
        }}
      />
    </Stack>
  );
}
