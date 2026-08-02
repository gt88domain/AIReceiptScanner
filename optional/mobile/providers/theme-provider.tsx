import AsyncStorage from "@react-native-async-storage/async-storage";
import { Uniwind } from "uniwind";
import {
  useEffect,
  useState,
  createContext,
  useCallback,
  useMemo,
  useContext,
  ReactNode,
} from "react";
import { appConfig } from "@/configs/app-config";
import { useColorScheme } from "@/hooks/use-color-scheme";

export type ThemeModePreference = "system" | "light" | "dark";
export type ThemeFamily = "alpha" | "lavender" | "mint" | "sky";
export type ResolvedThemeMode = "light" | "dark";
export type ActiveThemeName = `${ThemeFamily}-${ResolvedThemeMode}`;

interface ThemeContextValue {
  isReady: boolean;
  themeModePreference: ThemeModePreference;
  themeFamily: ThemeFamily;
  resolvedThemeMode: ResolvedThemeMode;
  activeThemeName: ActiveThemeName;
  setThemeModePreference: (themeModePreference: ThemeModePreference) => Promise<void>;
  setThemeFamily: (themeFamily: ThemeFamily) => Promise<void>;
}

const THEME_MODE_PREFERENCES = ["system", "light", "dark"] as const;
const THEME_FAMILIES = ["alpha", "lavender", "mint", "sky"] as const;

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeModePreference(value: string | null): value is ThemeModePreference {
  return value !== null && THEME_MODE_PREFERENCES.includes(value as ThemeModePreference);
}

function isThemeFamily(value: string | null): value is ThemeFamily {
  return value !== null && THEME_FAMILIES.includes(value as ThemeFamily);
}

function resolveThemeMode(
  themeModePreference: ThemeModePreference,
  colorScheme: ReturnType<typeof useColorScheme>,
): ResolvedThemeMode {
  if (themeModePreference === "system") {
    return colorScheme === "dark" ? "dark" : "light";
  }

  return themeModePreference;
}

function buildActiveThemeName(
  themeFamily: ThemeFamily,
  resolvedThemeMode: ResolvedThemeMode,
): ActiveThemeName {
  return `${themeFamily}-${resolvedThemeMode}`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [themeModePreference, setThemeModePreferenceState] =
    useState<ThemeModePreference>("system");
  const [themeFamily, setThemeFamilyState] = useState<ThemeFamily>("alpha");

  const resolvedThemeMode = resolveThemeMode(themeModePreference, colorScheme);
  const activeThemeName = buildActiveThemeName(themeFamily, resolvedThemeMode);

  useEffect(() => {
    let isMounted = true;

    async function initializeTheme() {
      try {
        if (!isMounted) {
          return;
        }

        const storedThemeModePreference = await AsyncStorage.getItem(
          appConfig.themePreferenceStorageKey,
        );

        const storedThemeFamily = await AsyncStorage.getItem(appConfig.themeFamilyStorageKey);

        const nextThemeModePreference = isThemeModePreference(storedThemeModePreference)
          ? storedThemeModePreference
          : "system";

        const nextThemeFamily = isThemeFamily(storedThemeFamily) ? storedThemeFamily : "alpha";

        const nextResolvedThemeMode = resolveThemeMode(nextThemeModePreference, colorScheme);

        const nextActiveThemeName = buildActiveThemeName(nextThemeFamily, nextResolvedThemeMode);

        setThemeModePreferenceState(nextThemeModePreference);
        setThemeFamilyState(nextThemeFamily);
        Uniwind.setTheme(nextActiveThemeName);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    initializeTheme();

    return () => {
      isMounted = false;
    };
  }, [colorScheme]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    Uniwind.setTheme(activeThemeName);
  }, [activeThemeName, isReady]);

  const setThemeModePreference = useCallback(
    async (nextThemeModePreference: ThemeModePreference) => {
      setThemeModePreferenceState(nextThemeModePreference);
      await AsyncStorage.setItem(appConfig.themePreferenceStorageKey, nextThemeModePreference);
    },
    [],
  );

  const setThemeFamily = useCallback(async (nextThemeFamily: ThemeFamily) => {
    setThemeFamilyState(nextThemeFamily);
    await AsyncStorage.setItem(appConfig.themeFamilyStorageKey, nextThemeFamily);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isReady,
      themeModePreference,
      themeFamily,
      resolvedThemeMode,
      activeThemeName,
      setThemeModePreference,
      setThemeFamily,
    }),
    [
      activeThemeName,
      isReady,
      resolvedThemeMode,
      setThemeFamily,
      setThemeModePreference,
      themeFamily,
      themeModePreference,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemePreference must be used within a ThemeProvider");
  }

  return context;
}
