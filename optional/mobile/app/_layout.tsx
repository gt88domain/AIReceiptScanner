import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "@/global.css";
import "@/i18n";
import { Providers } from "@/providers/providers";
import { useThemePreference } from "@/providers/theme-provider";
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { appConfig } from "@/configs/app-config";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen2";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  Saira_400Regular,
  Saira_500Medium,
  Saira_600SemiBold,
  Saira_700Bold,
} from "@expo-google-fonts/saira";
import {
  SNPro_400Regular,
  SNPro_500Medium,
  SNPro_600SemiBold,
  SNPro_700Bold,
} from "@expo-google-fonts/sn-pro";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  return (
    <Providers>
      <RootNavigator />
    </Providers>
  );
}

function RootNavigator() {
  const { isReady, resolvedThemeMode } = useThemePreference();
  const [onboardingState, setOnboardingState] = useState<"loading" | "show" | "done">("loading");

  const fonts = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Saira_400Regular,
    Saira_500Medium,
    Saira_600SemiBold,
    Saira_700Bold,
    SNPro_400Regular,
    SNPro_500Medium,
    SNPro_600SemiBold,
    SNPro_700Bold,
  });

  useEffect(() => {
    async function checkOnboarding() {
      const completed = await AsyncStorage.getItem(appConfig.onboardingCompletedStorageKey);
      setOnboardingState(completed === "true" ? "done" : "show");
    }

    checkOnboarding();
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    await AsyncStorage.setItem(appConfig.onboardingCompletedStorageKey, "true");
    setOnboardingState("done");
  }, []);

  if (!fonts || !isReady || onboardingState === "loading") {
    return null;
  }

  if (onboardingState === "show") {
    return (
      <>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style={resolvedThemeMode === "dark" ? "light" : "dark"} />
      </>
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(auth)"
          options={{ presentation: "fullScreenModal", headerShown: false }}
        />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
      <StatusBar style={resolvedThemeMode === "dark" ? "light" : "dark"} />
    </>
  );
}
