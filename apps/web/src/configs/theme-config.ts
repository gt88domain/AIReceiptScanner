import { z } from "zod";
import { webConfig } from "@/configs/web-config";
import { themePresets } from "./theme-presets";
import type { ThemePresetKey } from "./theme-presets";

export const USER_THEMES = {
  light: "Light",
  dark: "Dark",
  system: "System",
} as const;

export const THEME_CONFIG = {
  storageKeys: {
    userTheme: `${webConfig.AppName}-ui-theme`,
    preset: `${webConfig.AppName}-ui-preset`,
    presetStyles: `${webConfig.AppName}-ui-preset-styles`,
  },
  defaults: {
    userTheme: "system" as const,
    preset: webConfig.defaultThemePresetKey,
  },
} as const;

export const UserThemeSchema = z
  .enum(["light", "dark", "system"])
  .catch(THEME_CONFIG.defaults.userTheme);
export const AppThemeSchema = z.enum(["light", "dark"]).catch("light");
export const PresetSchema = z
  .string()
  .refine((k) => k in themePresets, { message: "Invalid preset" })
  .transform((k) => k as ThemePresetKey)
  .catch(THEME_CONFIG.defaults.preset);

export type UserTheme = z.infer<typeof UserThemeSchema>;
export type AppTheme = z.infer<typeof AppThemeSchema>;

// Inline script to prevent FOUC (handles both theme mode and preset styles)
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_CONFIG.storageKeys.userTheme}")||"${THEME_CONFIG.defaults.userTheme}";var v=["light","dark","system"].includes(t)?t:"${THEME_CONFIG.defaults.userTheme}";var mode;if(v==="system"){mode=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.add(mode,"system")}else{mode=v;document.documentElement.classList.add(v)}var ps=localStorage.getItem("${THEME_CONFIG.storageKeys.presetStyles}");if(ps){try{var styles=JSON.parse(ps)[mode];if(styles){var root=document.documentElement;Object.keys(styles).forEach(function(k){root.style.setProperty("--"+k,styles[k])})}}catch(e){}}}catch(e){var mode=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.add(mode,"system")}})()`;
