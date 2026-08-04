import { ScriptOnce } from "@tanstack/react-router";
import { createClientOnlyFn, createIsomorphicFn } from "@tanstack/react-start";
import { createContext, type ReactNode, use, useEffect, useState } from "react";
import { webConfig } from "@/configs/web-config";
import { defaultThemePreset } from "@/configs/default-theme";
import {
  type AppTheme,
  PresetSchema,
  THEME_CONFIG,
  themeScript,
  type UserTheme,
  UserThemeSchema,
} from "@/configs/theme-config";
import type { ThemePreset, ThemePresetKey } from "@/configs/theme-presets";

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

const applyTheme = createClientOnlyFn((styles: ThemePreset["styles"], mode: AppTheme) => {
  const themeStyles = styles[mode];
  const root = document.documentElement;

  Object.entries(themeStyles).forEach(([key, value]) => {
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
  setTheme: (theme: UserTheme) => void;
  setPreset: (preset: ThemePresetKey, styles: ThemePreset["styles"]) => void;
};

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Keep the hydration render deterministic. Persisted preferences are applied after React hydrates.
  const [userTheme, setUserTheme] = useState<UserTheme>(THEME_CONFIG.defaults.userTheme);
  const [preset, setPresetState] = useState<ThemePresetKey>(webConfig.defaultThemePresetKey);
  const [presetStyles, setPresetStyles] = useState<ThemePreset["styles"]>(
    defaultThemePreset.styles,
  );
  const appTheme = userTheme === "system" ? getSystemTheme() : userTheme;

  useEffect(() => {
    setUserTheme(getStoredUserTheme());
    const storedPreset = getStoredPreset();
    const storedStyles = localStorage.getItem(THEME_CONFIG.storageKeys.presetStyles);
    if (storedStyles) {
      try {
        const parsed = JSON.parse(storedStyles) as ThemePreset["styles"];
        if (parsed.light && parsed.dark) setPresetStyles(parsed);
      } catch {
        // Invalid local storage falls back to the default preset styles.
      }
    }
    setPresetState(storedPreset);
  }, []);

  // Apply theme on mount and changes
  useEffect(() => {
    const mode = applyMode(userTheme);
    applyTheme(presetStyles, mode);
    // Ensure preset styles are saved for FOUC prevention
    if (!localStorage.getItem(THEME_CONFIG.storageKeys.presetStyles)) {
      localStorage.setItem(THEME_CONFIG.storageKeys.presetStyles, JSON.stringify(presetStyles));
    }
  }, [presetStyles, userTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (userTheme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const mode = applyMode("system");
      applyTheme(presetStyles, mode);
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [presetStyles, userTheme]);

  const setTheme = (newTheme: UserTheme) => {
    const validated = UserThemeSchema.parse(newTheme);
    setUserTheme(validated);
    localStorage.setItem(THEME_CONFIG.storageKeys.userTheme, validated);
  };

  const setPreset = (newPreset: ThemePresetKey, styles: ThemePreset["styles"]) => {
    const validated = PresetSchema.parse(newPreset);
    setPresetState(validated);
    setPresetStyles(styles);
    localStorage.setItem(THEME_CONFIG.storageKeys.preset, validated);
    localStorage.setItem(THEME_CONFIG.storageKeys.presetStyles, JSON.stringify(styles));
  };

  return (
    <ThemeContext.Provider
      value={{
        userTheme,
        appTheme,
        preset,
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
