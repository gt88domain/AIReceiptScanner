import { ScriptOnce } from "@tanstack/react-router";
import { createClientOnlyFn, createIsomorphicFn } from "@tanstack/react-start";
import { createContext, type ReactNode, use, useEffect, useState } from "react";
import { webConfig } from "@/configs/web-config";
import {
  type AppTheme,
  PresetSchema,
  THEME_CONFIG,
  themeScript,
  type UserTheme,
  UserThemeSchema,
} from "@/configs/theme-config";
import { themePresets, type ThemePresetKey } from "@/configs/theme-presets";

const getStoredUserTheme = createIsomorphicFn()
  .server((): UserTheme => "system")
  .client((): UserTheme => {
    const stored = localStorage.getItem(THEME_CONFIG.storageKeys.userTheme);
    return UserThemeSchema.parse(stored);
  });

const getStoredPreset = createIsomorphicFn()
  .server((): ThemePresetKey => webConfig.defaultThemePresetKey)
  .client((): ThemePresetKey => {
    const stored = localStorage.getItem(THEME_CONFIG.storageKeys.preset);
    return PresetSchema.parse(stored);
  });

const getSystemTheme = createIsomorphicFn()
  .server((): AppTheme => "light")
  .client(
    (): AppTheme => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );

const applyTheme = createClientOnlyFn((presetKey: ThemePresetKey, mode: AppTheme) => {
  const preset = themePresets[presetKey];
  if (!preset) return;

  const styles = preset.styles[mode];
  const root = document.documentElement;

  Object.entries(styles).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
});

const applyMode = createClientOnlyFn((userTheme: UserTheme) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "system");

  if (userTheme === "system") {
    const systemTheme = getSystemTheme();
    root.classList.add(systemTheme, "system");
    return systemTheme;
  } else {
    root.classList.add(userTheme);
    return userTheme;
  }
});

type ThemeContextProps = {
  userTheme: UserTheme;
  appTheme: AppTheme;
  preset: ThemePresetKey;
  presets: typeof themePresets;
  setTheme: (theme: UserTheme) => void;
  setPreset: (preset: ThemePresetKey) => void;
};

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Keep the hydration render deterministic. Persisted preferences are applied after React hydrates.
  const [userTheme, setUserTheme] = useState<UserTheme>(THEME_CONFIG.defaults.userTheme);
  const [preset, setPresetState] = useState<ThemePresetKey>(webConfig.defaultThemePresetKey);
  const appTheme = userTheme === "system" ? getSystemTheme() : userTheme;

  useEffect(() => {
    setUserTheme(getStoredUserTheme());
    setPresetState(getStoredPreset());
  }, []);

  // Apply theme on mount and changes
  useEffect(() => {
    const mode = applyMode(userTheme);
    applyTheme(preset, mode);
    // Ensure preset styles are saved for FOUC prevention
    const presetData = themePresets[preset];
    if (presetData && !localStorage.getItem(THEME_CONFIG.storageKeys.presetStyles)) {
      localStorage.setItem(
        THEME_CONFIG.storageKeys.presetStyles,
        JSON.stringify(presetData.styles),
      );
    }
  }, [userTheme, preset]);

  // Listen for system theme changes
  useEffect(() => {
    if (userTheme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const mode = applyMode("system");
      applyTheme(preset, mode);
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [userTheme, preset]);

  const setTheme = (newTheme: UserTheme) => {
    const validated = UserThemeSchema.parse(newTheme);
    setUserTheme(validated);
    localStorage.setItem(THEME_CONFIG.storageKeys.userTheme, validated);
  };

  const setPreset = (newPreset: ThemePresetKey) => {
    const validated = PresetSchema.parse(newPreset);
    setPresetState(validated);
    localStorage.setItem(THEME_CONFIG.storageKeys.preset, validated);
    // Save preset styles for FOUC prevention on page reload
    const presetData = themePresets[validated];
    if (presetData) {
      localStorage.setItem(
        THEME_CONFIG.storageKeys.presetStyles,
        JSON.stringify(presetData.styles),
      );
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        userTheme,
        appTheme,
        preset,
        presets: themePresets,
        setTheme,
        setPreset,
      }}
    >
      <ScriptOnce>{themeScript}</ScriptOnce>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
